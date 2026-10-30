import type { Request, Response } from 'express';
import { getGeminiClient, GEMINI_MODEL } from './geminiClient.js';

export interface WasteScanResult {
  category: 'organik' | 'plastik' | 'kertas' | 'logam' | 'kaca' | 'B3' | 'lainnya';
  item_name: string;
  confidence: number;
  how_to_sort: string;
  how_to_recycle: string;
  eco_impact_tip: string;
  nearest_facility_suggestion: string;
}

export default async function wasteScanHandler(req: Request, res: Response) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body: { image?: string; apiKey?: string; model?: string } = {};
  if (typeof req.body === 'string') {
    try {
      body = JSON.parse(req.body);
    } catch {
      return res.status(400).json({ error: 'Format data JSON tidak valid.' });
    }
  } else if (req.body && typeof req.body === 'object') {
    body = req.body;
  }

  const { image, apiKey, model } = body;
  if (!image || typeof image !== 'string' || !image.trim()) {
    return res.status(400).json({ error: 'Foto sampah wajib disertakan.' });
  }

  const ai = getGeminiClient(apiKey);
  if (!ai) {
    return res.status(200).json(getSimulatedWasteScan());
  }

  const parsed = parseImage(image);
  if (!parsed) {
    return res.status(400).json({ error: 'Format foto sampah tidak dikenali.' });
  }

  try {
    const promptText = `
Identifikasi objek sampah pada foto ini untuk pemilahan sampah ramah lingkungan di Tarutung & Danau Toba.
Kembalikan HANYA JSON MURNI tanpa format markdown:
{
  "category": "organik" | "plastik" | "kertas" | "logam" | "kaca" | "B3" | "lainnya",
  "item_name": "Nama benda yang dikenali (Bahasa Indonesia)",
  "confidence": 90,
  "how_to_sort": "Instruksi cara memilah (misal: bersihkan dari sisa cairan, remukkan, pisahkan tutup)",
  "how_to_recycle": "Cara daur ulang atau pemanfaatan (misal: kompos untuk pupuk tanaman gereja, diserahkan ke bank sampah)",
  "eco_impact_tip": "Nilai ekoteologis atau manfaat pelestarian alam Danau Toba",
  "nearest_facility_suggestion": "Saran penyerahan fasilitas (misal: Bank Sampah Induk Tarutung, Kompos Kampus IAKN, Bank Sampah HKBP Pearaja)"
}
`;

    const modelsToTry = [
      GEMINI_MODEL,
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-3-flash-preview',
      'gemini-3.7-flash',
      'gemini-3.8-flash',
    ].filter((m, i, arr) => m && arr.indexOf(m) === i);

    let response;
    let lastErr: unknown;
    for (const model of modelsToTry) {
      try {
        response = await ai.models.generateContent({
          model,
          contents: {
            parts: [
              {
                inlineData: {
                  data: parsed.data,
                  mimeType: parsed.mimeType,
                },
              },
              { text: promptText },
            ],
          },
        });
        break;
      } catch (err) {
        lastErr = err;
        continue;
      }
    }

    if (!response) {
      throw lastErr;
    }

    let text = response.text?.trim() || '';
    if (text.startsWith('```json')) {
      text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (text.startsWith('```')) {
      text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const result: WasteScanResult = JSON.parse(text);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in /api/waste-scan:', error);
    return res.status(200).json(getSimulatedWasteScan());
  }
}

function parseImage(image: string): { data: string; mimeType: string } | null {
  if (!image || typeof image !== 'string') return null;
  const commaIndex = image.indexOf(',');
  if (image.startsWith('data:') && commaIndex !== -1) {
    const meta = image.substring(5, commaIndex);
    const data = image.substring(commaIndex + 1).replace(/\s+/g, '');
    let mimeType = 'image/jpeg';
    const mimeMatch = meta.match(/^[a-zA-Z0-9.+_-]+\/[a-zA-Z0-9.+_-]+/);
    if (mimeMatch) {
      mimeType = mimeMatch[0].toLowerCase();
      if (mimeType === 'image/jpg') mimeType = 'image/jpeg';
    }
    if (!data) return null;
    return { data, mimeType };
  }
  const cleanData = image.replace(/\s+/g, '');
  if (!cleanData) return null;
  return { data: cleanData, mimeType: 'image/jpeg' };
}

function getSimulatedWasteScan(): WasteScanResult {
  return {
    category: 'plastik',
    item_name: 'Botol Minuman PET Bening',
    confidence: 94,
    how_to_sort: 'Kosongkan sisa air, lepas label plastik tipis, dan remas botol untuk menghemat ruang tampung.',
    how_to_recycle: 'Bisa disetorkan ke bank sampah untuk didaur ulang menjadi serat tekstil/dakron atau dijadikan pot vertikal kebun kampus IAKN.',
    eco_impact_tip: 'Mencegah 0.04 kg sampah plastik mencemari aliran Sungai Sigeaon yang bermuara menuju ekosistem Danau Toba.',
    nearest_facility_suggestion: 'Bank Sampah IAKN Tarutung (Gedung PKM) atau Bank Sampah Bersih Silindung',
  };
}
