import type { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { getGeminiClient, getGeminiModel, GEMINI_MODEL } from './geminiClient.js';

export interface TestAiRequestBody {
  apiKey?: string;
  model?: string;
  systemPrompt?: string;
  appDescription?: string;
  testPrompt?: string;
}

export default async function testAiHandler(req: Request, res: Response) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let body: Partial<TestAiRequestBody> = {};
  if (typeof req.body === 'string') {
    try {
      body = JSON.parse(req.body);
    } catch {
      return res.status(400).json({ error: 'Format data JSON tidak valid.' });
    }
  } else if (req.body && typeof req.body === 'object') {
    body = req.body;
  }

  const { apiKey, model, systemPrompt = '', appDescription = '', testPrompt } = body;

  const rawKey =
    apiKey?.trim() ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    '';

  const apiKeySource = apiKey?.trim()
    ? 'admin_settings'
    : (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)
    ? 'environment_variable'
    : 'none';

  const apiKeyMasked = rawKey
    ? rawKey.length > 8
      ? `${rawKey.substring(0, 6)}...${rawKey.substring(rawKey.length - 4)}`
      : '***'
    : '(Tidak Ditemukan)';

  const modelRequested = model?.trim() || GEMINI_MODEL || 'gemini-3.5-flash';
  const query = testPrompt?.trim() || 'Perkenalkan dirimu dalam 1 kalimat singkat dan sebutkan namamu sesuai instruksi sistem.';

  if (!rawKey) {
    return res.status(200).json({
      ok: false,
      status: 'failed',
      timestamp: new Date().toISOString(),
      diagnostics: {
        apiKeySource: 'none',
        apiKeyMasked: '(Tidak Ditemukan)',
        modelRequested,
        modelResolved: modelRequested,
        latencyMs: 0,
        hasSystemPrompt: Boolean(systemPrompt.trim()),
        systemPromptLength: systemPrompt.trim().length,
        systemPromptPreview: systemPrompt.trim().slice(0, 100),
        hasAppDescription: Boolean(appDescription.trim()),
        appDescriptionLength: appDescription.trim().length,
      },
      error: {
        code: 503,
        message: 'API Key Gemini belum disetel. Isi kolom Gemini API Key di panel ini atau atur GEMINI_API_KEY di Vercel.',
        suggestion: 'Dapatkan API Key gratis di https://aistudio.google.com/app/apikey lalu masukkan di form Pengaturan AI.',
      },
    });
  }

  const defaultInstruction = `
Kamu adalah "Sahabat Ciptaan", asisten ekoteologi Kristen untuk jemaat gereja dan mahasiswa IAKN Tarutung di kawasan Danau Toba.
Jawab ramah, santun, dan sebutkan bahwa kamu adalah Sahabat Ciptaan.
`.trim();

  const appDescNote = appDescription.trim()
    ? `\nDeskripsi Aplikasi: ${appDescription.trim()}\n`
    : '';
  const adminPromptNote = systemPrompt.trim()
    ? `\nInstruksi Khusus Admin: ${systemPrompt.trim()}\n`
    : '';

  const activeInstruction = `${defaultInstruction}${appDescNote}${adminPromptNote}`.trim();

  const ai = new GoogleGenAI({
    apiKey: rawKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build-diagnostics',
      },
    },
  });

  const startTime = Date.now();
  const modelsToAudit = [
    modelRequested,
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-3-flash-preview',
    'gemini-3.8-flash',
  ].filter((m, i, arr) => m && arr.indexOf(m) === i);

  const auditResults: Array<{ model: string; status: 'ok' | 'error'; code?: number; error?: string; latencyMs?: number }> = [];
  let successfulModel: string | null = null;
  let successfulResponse: string | null = null;
  let primaryError: { code: number; message: string; suggestion: string } | null = null;

  for (const mod of modelsToAudit) {
    const t0 = Date.now();
    try {
      const response = await ai.models.generateContent({
        model: mod,
        contents: [{ role: 'user', parts: [{ text: query }] }],
        config: {
          systemInstruction: activeInstruction,
          maxOutputTokens: 300,
        },
      });

      const latencyMs = Date.now() - t0;
      const text = response.text?.trim() || '';
      auditResults.push({ model: mod, status: 'ok', latencyMs });

      if (!successfulModel && text) {
        successfulModel = mod;
        successfulResponse = text;
      }
    } catch (err: unknown) {
      const latencyMs = Date.now() - t0;
      const statusCode = getErrorStatusCode(err);
      const errMsg = err instanceof Error ? err.message : String(err);
      auditResults.push({
        model: mod,
        status: 'error',
        code: statusCode,
        error: errMsg.slice(0, 160),
        latencyMs,
      });

      if (!primaryError && mod === modelRequested) {
        primaryError = {
          code: statusCode,
          message: errMsg,
          suggestion: getActionableSuggestion(statusCode, errMsg, mod),
        };
      }
    }
  }

  const totalLatencyMs = Date.now() - startTime;

  if (successfulModel && successfulResponse) {
    return res.status(200).json({
      ok: true,
      status: 'connected',
      timestamp: new Date().toISOString(),
      diagnostics: {
        apiKeySource,
        apiKeyMasked,
        modelRequested,
        modelResolved: successfulModel,
        latencyMs: totalLatencyMs,
        hasSystemPrompt: Boolean(systemPrompt.trim()),
        systemPromptLength: systemPrompt.trim().length,
        systemPromptPreview: systemPrompt.trim().slice(0, 150),
        hasAppDescription: Boolean(appDescription.trim()),
        appDescriptionLength: appDescription.trim().length,
      },
      testOutput: {
        prompt: query,
        response: successfulResponse,
        instructionApplied: Boolean(systemPrompt.trim()),
      },
      audit: auditResults,
      notice:
        successfulModel !== modelRequested
          ? `Model yang diminta (${modelRequested}) mengalami kendala, namun fallback ke ${successfulModel} berhasil.`
          : 'Koneksi ke AI Gemini berjalan optimal dan instruksi sistem diterapkan.',
    });
  }

  const finalCode = primaryError?.code || 502;
  const finalMessage = primaryError?.message || 'Semua percobaan model Gemini gagal terhubung.';
  const finalSuggestion = primaryError?.suggestion || 'Periksa API Key dan pastikan kuota API aktif.';

  return res.status(200).json({
    ok: false,
    status: 'failed',
    timestamp: new Date().toISOString(),
    diagnostics: {
      apiKeySource,
      apiKeyMasked,
      modelRequested,
      modelResolved: null,
      latencyMs: totalLatencyMs,
      hasSystemPrompt: Boolean(systemPrompt.trim()),
      systemPromptLength: systemPrompt.trim().length,
      systemPromptPreview: systemPrompt.trim().slice(0, 100),
      hasAppDescription: Boolean(appDescription.trim()),
      appDescriptionLength: appDescription.trim().length,
    },
    audit: auditResults,
    error: {
      code: finalCode,
      message: finalMessage,
      suggestion: finalSuggestion,
    },
  });
}

function getErrorStatusCode(error: unknown): number {
  if (!error || typeof error !== 'object') return 500;
  const c = error as { status?: unknown; code?: unknown; statusCode?: unknown };
  if (typeof c.status === 'number') return c.status;
  if (typeof c.code === 'number') return c.code;
  if (typeof c.statusCode === 'number') return c.statusCode;
  const msg = String(error);
  if (msg.includes('401') || msg.includes('API_KEY_INVALID')) return 401;
  if (msg.includes('403') || msg.includes('PERMISSION_DENIED')) return 403;
  if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) return 429;
  if (msg.includes('404') || msg.includes('NOT_FOUND')) return 404;
  if (msg.includes('400') || msg.includes('INVALID_ARGUMENT')) return 400;
  return 500;
}

function getActionableSuggestion(code: number, msg: string, model: string): string {
  if (code === 401 || code === 403 || msg.includes('API_KEY_INVALID')) {
    return 'Kunci API (API Key) tidak valid atau salah salin. Buat kunci baru di Google AI Studio (https://aistudio.google.com) lalu tempelkan kembali.';
  }
  if (code === 429 || msg.includes('RESOURCE_EXHAUSTED')) {
    return `Kuota limit (429) tercapai untuk model ${model}. Coba ganti Model Gemini di form ke "gemini-3.5-flash" atau "gemini-3.1-flash-lite" yang memiliki kuota lebih tinggi.`;
  }
  if (code === 404 || msg.includes('NOT_FOUND')) {
    return `Model "${model}" tidak ditemukan atau telah didepresiasi oleh Google. Ganti ke model "gemini-3.5-flash".`;
  }
  if (code === 400) {
    return 'Format permintaan atau instruksi sistem mengandung parameter yang tidak didukung model. Coba bersihkan karakter khusus.';
  }
  return 'Terjadi kendala jaringan saat menghubungi server Gemini. Pastikan server terhubung ke internet.';
}
