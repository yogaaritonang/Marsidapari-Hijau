import type { Request, Response } from 'express';
import { getGeminiClient, GEMINI_MODEL } from './geminiClient.js';

export default async function reportAssistHandler(req: Request, res: Response) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body: { title?: string; rawNotes?: string; category?: string; locationName?: string } = {};
  if (typeof req.body === 'string') {
    try {
      body = JSON.parse(req.body);
    } catch {
      return res.status(400).json({ error: 'Format data JSON tidak valid.' });
    }
  } else if (req.body && typeof req.body === 'object') {
    body = req.body;
  }

  const { title = '', rawNotes = '', category = 'masalah lingkungan', locationName = 'Tarutung' } = body;

  const ai = getGeminiClient();
  if (!ai) {
    return res.status(200).json({
      formal_description: `Laporan warga mengenai temuan ${category || 'masalah lingkungan'} di sekitar ${locationName || 'kawasan Tapanuli Utara'}. ${rawNotes || 'Kondisi membutuhkan perhatian dan aksi gotong royong warga/jemaat untuk pembersihan bersama.'}`,
      recommended_action: 'Jadwalkan aksi gotong royong Marsiadapari jemaat atau laporkan ke pengurus lingkungan/dinas kebersihan setempat.',
      urgency_level: 'Sedang',
    });
  }

  try {
    const promptText = `
Bantu rapikan deskripsi laporan warga mengenai masalah lingkungan hidup di Tarutung / kawasan Danau Toba:
Judul Laporan: "${title}"
Kategori: "${category}"
Lokasi: "${locationName}"
Catatan mentah pengguna: "${rawNotes}"

Tugas:
1. Susun "formal_description" yang obyektif, santun, jelas, dan siap diteruskan ke pimpinan gereja / sinode / kampus IAKN / dinas lingkungan setempat.
2. Tentukan "recommended_action": usulan aksi gotong royong jemaat (misal: Aksi Sabtu Bersih Marsiadapari, pemasangan plang larangan buang sampah, reboisasi bibit).
3. Tentukan "urgency_level": 'Rendah' | 'Sedang' | 'Tinggi'.

Kembalikan HANYA JSON MURNI:
{
  "formal_description": "...",
  "recommended_action": "...",
  "urgency_level": "Sedang"
}
`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: promptText,
    });

    let text = response.text?.trim() || '';
    if (text.startsWith('```json')) {
      text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (text.startsWith('```')) {
      text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    return res.status(200).json(JSON.parse(text));
  } catch (error) {
    console.error('Error in /api/report-assist:', error);
    return res.status(200).json({
      formal_description: `Laporan resmi mengenai temuan ${category} di lokasi ${locationName}. Terindikasi memerlukan penanganan dan gotong royong terpadu. Catatan pelapor: "${rawNotes}"`,
      recommended_action: 'Agendakan kerja bakti jemaat dan pemuda gereja serta koordinasi dengan warga setempat.',
      urgency_level: 'Sedang',
    });
  }
}
