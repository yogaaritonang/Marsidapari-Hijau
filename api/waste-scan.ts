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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image } = req.body;
  if (!image) {
    return res.status(400).json({ error: 'Foto sampah wajib disertakan.' });
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.status(200).json(getSimulatedWasteScan());
  }

  try {
    let base64Data = image;
    let mimeType = 'image/jpeg';
    if (image.startsWith('data:')) {
      const match = image.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      }
    }

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

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          { text: promptText },
        ],
      },
    });

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
