import type { Request, Response } from 'express';
import { ThinkingLevel } from '@google/genai';
import { getGeminiClient, GEMINI_MODEL } from './geminiClient.js';

export interface ChatRequestBody {
  message: string;
  history?: Array<{ role: 'user' | 'model'; parts: string }>;
  context?: {
    userName?: string;
    community?: string;
    points?: number;
    completedCount?: number;
  };
}

export default async function chatHandler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, history = [], context = {} } = req.body as ChatRequestBody;

  if (!message) {
    return res.status(400).json({ error: 'Pesan tidak boleh kosong.' });
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({ error: 'Chatbot AI belum dikonfigurasi. Admin perlu mengatur GEMINI_API_KEY di server.' });
  }

  try {
    const systemInstruction = `
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

    const contents = [];
    for (const h of history.slice(-4)) {
      contents.push({
        role: h.role,
        parts: [{ text: h.parts }],
      });
    }
    // Add current user message
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        systemInstruction,
        maxOutputTokens: 512,
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
      },
    });

    const reply = response.text?.trim();
    if (!reply) return res.status(502).json({ error: 'Chatbot tidak menghasilkan jawaban. Silakan coba lagi.' });
    return res.status(200).json({ reply });
  } catch (error) {
    console.error('Error in /api/chat:', error);
    const status = getGeminiErrorStatus(error);
    const errorMessage = status === 429
      ? 'Kuota AI sedang penuh. Tunggu sebentar lalu coba lagi.'
      : status === 401 || status === 403
      ? 'Kunci AI tidak valid atau tidak memiliki akses. Admin perlu memeriksa konfigurasi Gemini.'
      : status === 400
      ? 'Permintaan AI tidak dapat diproses. Coba ringkas pertanyaan Anda.'
      : 'Chatbot AI sedang mengalami kendala. Silakan coba lagi sebentar.';
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
