import type { Request, Response } from 'express';
import { getGeminiClient, getGeminiModel } from './geminiClient.js';

export interface GenerateReflectionRequest {
  topicOrMood: string;
  userName?: string;
  community?: string;
  apiKey?: string;
  model?: string;
}

export interface GeneratedReflection {
  title: string;
  scripture: string;
  verse_text: string;
  body: string;
  call_to_action: string;
  batak_wisdom?: string;
  suggested_challenge: string;
  reading_time_minutes: number;
}

export default async function reflectionHandler(req: Request, res: Response) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body: Partial<GenerateReflectionRequest> = {};
  if (typeof req.body === 'string') {
    try {
      body = JSON.parse(req.body);
    } catch {
      return res.status(400).json({ error: 'Format data JSON tidak valid.' });
    }
  } else if (req.body && typeof req.body === 'object') {
    body = req.body;
  }

  const { topicOrMood, userName, community, apiKey, model } = body;

  if (!topicOrMood) {
    return res.status(400).json({ error: 'Topik atau suasana hati wajib diisi.' });
  }

  const ai = getGeminiClient(apiKey);
  if (!ai) {
    return res.status(200).json(getSimulatedReflection(topicOrMood));
  }

  try {
    const promptText = `
Buatkan renungan ekoteologi Kristen singkat (1 menit baca) untuk jemaat/mahasiswa IAKN Tarutung & Tapanuli Utara di kawasan Danau Toba.
Topik atau suasana hati pengguna: "${topicOrMood}"
Pengguna: "${userName || 'Sahabat Ciptaan'}" dari "${community || 'IAKN Tarutung'}"

Persyaratan:
1. Pilih ayat Alkitab yang tepat dan akurat terkait penciptaan, pemeliharaan alam, atau pengharapan (misal: Mazmur 24:1, Kejadian 1:31, Kejadian 2:15, Mazmur 104, Roma 8:19-22, Yesaya 55:12, dll).
2. Isi renungan sekitar 100-150 kata (1 menit baca), bernada teduh, reflektif, menyentuh hati, menghubungkan firman dengan kearifan lokal Batak (Marsiadapari, merawat Danau Toba).
3. Ajakan aksi nyata yang aplikatif hari ini.
4. Kembalikan HANYA JSON MURNI tanpa blok markdown:
{
  "title": "Judul Renungan yang Puitis dan Menguatkan",
  "scripture": "Nama Kitab Pasal:Ayat",
  "verse_text": "Kutipan bunyi ayat Alkitab",
  "body": "Isi renungan singkat mendalam (100-150 kata)",
  "call_to_action": "Ajakan aksi konkret hari ini",
  "batak_wisdom": "Ungkapan atau falsafah Batak relevan (misal: Marsiadapari mamparbuehon denggan)",
  "suggested_challenge": "Nama aksi (misal: Hemat Air, Bawa Tumbler, Tanam Tunas)",
  "reading_time_minutes": 1
}
`;

    const chosenModel = getGeminiModel(model);
    const response = await ai.models.generateContent({
      model: chosenModel,
      contents: promptText,
    });

    let text = response.text?.trim() || '';
    if (text.startsWith('```json')) {
      text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (text.startsWith('```')) {
      text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed: GeneratedReflection = JSON.parse(text);
    return res.status(200).json(parsed);
  } catch (error) {
    console.error('Error in /api/reflection:', error);
    return res.status(200).json(getSimulatedReflection(topicOrMood));
  }
}

function getSimulatedReflection(topic: string): GeneratedReflection {
  return {
    title: `Mata Air Pengharapan di Rura Silindung: ${topic}`,
    scripture: 'Mazmur 104:10-13',
    verse_text: 'Engkau yang melepas mata-mata air ke dalam lembah-lembah, mengalir di antara gunung-gunung.',
    body: `Ketika kita memandang perbukitan yang mengitari Tarutung hingga riak Danau Toba, kita menyaksikan kidung agung kasih Tuhan. Segala ciptaan berseru memuliakan Dia. Rasa ${topic} yang kita alami hari ini mengingatkan bahwa Tuhan tidak pernah membiarkan bumi terlantar; Ia menyiram perbukitan dari tempat-tempat tinggi-Nya. Panggilan kita sebagai jemaat adalah menjadi rekan sekerja Allah dalam memelihara kesejukan tanah pusaka ini dengan tangan yang rela bergotong royong.`,
    call_to_action: 'Hari ini, luangkan 5 menit untuk menyiram tanaman di pekarangan atau hemat penggunaan air bersih sebagai ucapan syukur atas anugerah sumber air Tapanuli.',
    batak_wisdom: 'Pantun hangoluan, toka hamagoan: Merawat alam membawa kehidupan bagi anak cucu.',
    suggested_challenge: 'Hemat Air Hari Ini',
    reading_time_minutes: 1,
  };
}
