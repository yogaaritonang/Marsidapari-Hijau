import type { Request, Response } from 'express';
import { ThinkingLevel } from '@google/genai';
import { getGeminiClient, GEMINI_MODEL, getGeminiModel } from './geminiClient.js';

export interface ChatRequestBody {
  message: string;
  history?: Array<{ role: 'user' | 'model'; parts: string }>;
  context?: {
    userName?: string;
    community?: string;
    points?: number;
    completedCount?: number;
  };
  systemPrompt?: string;
  appDescription?: string;
  apiKey?: string;
  model?: string;
}

export default async function chatHandler(req: Request, res: Response) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body: Partial<ChatRequestBody> = {};
  if (typeof req.body === 'string') {
    try {
      body = JSON.parse(req.body);
    } catch {
      return res.status(400).json({ error: 'Format data JSON tidak valid.' });
    }
  } else if (req.body && typeof req.body === 'object') {
    body = req.body;
  }

  const { message, history = [], context = {}, systemPrompt, appDescription, apiKey, model } = body;

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Pesan tidak boleh kosong.' });
  }

  const ai = getGeminiClient(apiKey);
  if (!ai) {
    return res.status(503).json({
      error: 'Chatbot AI belum aktif. Pastikan API Key diisi di Dashboard Admin atau diatur di Environment Variables Vercel (GEMINI_API_KEY).',
    });
  }

  try {
    const defaultInstruction = `
Kamu adalah "Sahabat Ciptaan", asisten ekoteologi Kristen untuk jemaat gereja (HKBP, GKPI, dll.) dan mahasiswa IAKN Tarutung di kawasan Danau Toba, Tapanuli Utara.
Jawab langsung sesuai pertanyaan, dalam Bahasa Indonesia santun, hangat, ringkas, spesifik, dan bervariasi. Hindari mengulang salam atau paragraf umum jika percakapan sudah berjalan.
Topik yang dapat dibantu: fitur aplikasi, langkah penggunaan akun/profil, verifikasi foto tantangan, poin dan lencana, taman virtual, pelaporan lingkungan, komunitas, chatbot, serta praktik ekologi dan ekoteologi.
Informasi aplikasi: pengunjung dapat menjelajah dan memakai chatbot; perlu masuk untuk mengirim laporan atau memverifikasi aksi. Anggota dapat mengubah nama/komunitas/foto profil di tab Profil. Tombol GPS ada di formulir Buat Laporan. Siram tanaman memberi EXP taman. Verifikasi foto menggunakan AI dan hasil yang meragukan perlu ditinjau manusia.
Jika pengguna bertanya hal di luar aplikasi, bantu sewajarnya dan jelaskan bila informasi tidak pasti. Jangan mengarang tombol atau kebijakan yang tidak tersedia.
Kaitkan dengan Alkitab atau kearifan lokal Batak hanya bila relevan, jangan memaksakan ayat ke setiap jawaban. Jangan membuat klaim ilmiah atau kutipan ayat fiktif.
Konteks pengguna:
   - Nama: ${context.userName || 'Sahabat'}
   - Komunitas/Gereja: ${context.community || 'IAKN Tarutung'}
   - Poin Hijau: ${context.points ?? 0}
   - Tantangan diselesaikan: ${context.completedCount ?? 0}
Berikan tag [REKOMENDASI: nama tantangan] hanya jika memang menyarankan tantangan yang tersedia dan relevan. Jangan menambah tag jika tidak sesuai.
`;

    const appDescNote = appDescription?.trim()
      ? `\nDeskripsi & Konteks Aplikasi dari Admin:\n${appDescription.trim()}\n`
      : '';
    const adminPromptNote = systemPrompt?.trim()
      ? `\nInstruksi Tambahan dari Admin:\n${systemPrompt.trim()}\n`
      : '';

    const activeInstruction = `${defaultInstruction}${appDescNote}${adminPromptNote}`.trim();

    const contents = [];
    if (Array.isArray(history)) {
      for (const h of history.slice(-6)) {
        if (h && typeof h.parts === 'string' && (h.role === 'user' || h.role === 'model')) {
          contents.push({
            role: h.role,
            parts: [{ text: h.parts }],
          });
        }
      }
    }

    // Add current user message
    contents.push({
      role: 'user',
      parts: [{ text: message.trim() }],
    });

    const chosenModel = getGeminiModel(model);
    const modelsToTry = [
      chosenModel,
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-3-flash-preview',
      'gemini-3.8-flash',
    ].filter((m, i, arr) => m && arr.indexOf(m) === i);

    let response;
    let lastErr: unknown;
    for (const mod of modelsToTry) {
      try {
        response = await ai.models.generateContent({
          model: mod,
          contents,
          config: {
            systemInstruction: activeInstruction,
            maxOutputTokens: 800,
          },
        });
        if (response && response.text) break;
      } catch (err) {
        lastErr = err;
        continue;
      }
    }

    if (!response || !response.text) {
      throw lastErr;
    }

    const reply = response.text.trim();
    if (!reply) return res.status(502).json({ error: 'Chatbot tidak menghasilkan jawaban. Silakan coba lagi.' });
    return res.status(200).json({ reply });
  } catch (error) {
    console.error('Error in /api/chat:', error);
    const status = getGeminiErrorStatus(error);
    const errorDetails = error instanceof Error ? error.message : String(error);
    const errorMessage = status === 429
      ? 'Kuota AI sedang penuh (429 Too Many Requests). Tunggu beberapa saat lalu coba lagi.'
      : status === 401 || status === 403
      ? 'Kunci API Gemini tidak valid atau tidak memiliki izin akses (401/403). Periksa kembali API Key di Pengaturan Admin.'
      : status === 400
      ? `Permintaan AI tidak dapat diproses: ${errorDetails.slice(0, 120)}`
      : errorDetails.includes('NOT_FOUND')
      ? 'Model AI yang dipilih tidak ditemukan. Coba ganti ke model gemini-3.5-flash di Pengaturan Admin.'
      : 'Chatbot AI sedang mengalami kendala jaringan atau server. Silakan coba lagi sebentar.';
    return res.status(status >= 400 && status < 600 ? status : 502).json({ error: errorMessage });
  }
}

function getGeminiErrorStatus(error: unknown): number {
  if (!error || typeof error !== 'object') return 502;
  const candidate = error as { status?: unknown; code?: unknown };
  const status = typeof candidate.status === 'number'
    ? candidate.status
    : typeof candidate.code === 'number'
    ? candidate.code
    : 502;
  return status >= 400 && status < 600 ? status : 502;
}
