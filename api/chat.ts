import type { Request, Response } from 'express';
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
    return res.status(200).json(getSimulatedChatResponse(message, context));
  }

  try {
    const systemInstruction = `
Kamu adalah "Sahabat Ciptaan", asisten ekoteologi Kristen untuk jemaat gereja (HKBP, GKPI, dll.) dan mahasiswa IAKN Tarutung di kawasan Danau Toba, Tapanuli Utara.
Prinsip utama:
1. Jawab singkat, hangat, menguatkan, dalam Bahasa Indonesia yang santun.
2. Kaitkan dengan Alkitab (misal Mazmur 24:1 'Tuhanlah yang empunya bumi serta segala isinya', Kejadian 2:15 mengusahakan dan memelihara taman, Kejadian 1:31 'sungguh amat baik', Roma 8:19-22) dan aksi nyata pelestarian alam.
3. Hormati dan angkat kearifan lokal Batak, khususnya semangat "Marsiadapari" (gotong royong tanpa pamrih saling membantu), "Si pogos so marripu, si mamora so marhaha maranggi", serta perlindungan Danau Toba dan bona pasogit.
4. Jangan membuat klaim ilmiah palsu atau kutipan ayat fiktif. Jika tidak yakin, katakan terus terang dengan rendah hati.
5. Konteks pengguna saat ini:
   - Nama: ${context.userName || 'Sahabat'}
   - Komunitas/Gereja: ${context.community || 'IAKN Tarutung'}
   - Poin Hijau: ${context.points ?? 0}
   - Tantangan diselesaikan: ${context.completedCount ?? 0}
6. Berikan rekomendasi aksi konkret jika relevan. Jika menyarankan tantangan, kamu boleh menyertakan tag aksi di akhir seperti "[REKOMENDASI: Bawa Tumbler]" atau "[REKOMENDASI: Tanam Pohon]" atau "[REKOMENDASI: Pilah Sampah]" agar aplikasi bisa menampilkan tombol jalan pintas langsung ke tantangan tersebut.
`;

    const contents = [];
    // Convert previous history
    for (const h of history.slice(-6)) {
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
        temperature: 0.7,
      },
    });

    const reply = response.text || 'Horas! Mari kita terus bergotong royong merawat ciptaan Tuhan hari ini.';
    return res.status(200).json({ reply });
  } catch (error) {
    console.error('Error in /api/chat:', error);
    return res.status(200).json(getSimulatedChatResponse(message, context));
  }
}

function getSimulatedChatResponse(message: string, context: { userName?: string; community?: string }): { reply: string } {
  const msgLower = message.toLowerCase();
  const name = context.userName || 'Sahabat';

  if (msgLower.includes('danau toba') || msgLower.includes('toba')) {
    return {
      reply: `Horas ${name}! Danau Toba adalah anugerah agung Tuhan bagi tanah Batak. Dalam Mazmur 104:10, Allah mengalirkan mata air ke lembah-lembah. Dengan marsiadapari (gotong royong) membersihkan tepian danau dan menolak buang sampah plastik, kita sedang memuliakan Sang Pencipta! [REKOMENDASI: Bersih Sungai/Danau]`,
    };
  } else if (msgLower.includes('sampah') || msgLower.includes('plastik') || msgLower.includes('tumbler')) {
    return {
      reply: `Pertanyaan yang sangat bagus, ${name}. Membawa tumbler dan memilah sampah bukan sekadar gaya hidup, tapi ibadah ekologis nyata (Kejadian 2:15). Setiap sampah plastik yang kita cegah menjaga ekosistem tanah Silindung tetap subur. [REKOMENDASI: Bawa Tumbler]`,
    };
  } else if (msgLower.includes('pohon') || msgLower.includes('tanam')) {
    return {
      reply: `Luar biasa, ${name}! Menanam satu pohon di lereng bukit Tarutung berarti menyediakan oksigen, mengikat air tanah, dan mencegah longsor. Seperti pohon yang ditanam di tepi aliran air (Mazmur 1:3), aksi kita berbuah berkat bagi sesama. [REKOMENDASI: Tanam Pohon]`,
    };
  } else if (msgLower.includes('ayat') || msgLower.includes('renungan') || msgLower.includes('alkitab')) {
    return {
      reply: `Ingatlah Mazmur 24:1: "Tuhanlah yang empunya bumi serta segala isinya, dan dunia serta yang diam di dalamnya." Bumi ini adalah rumah kediaman bersama ciptaan-Nya. Pilihan kecil kita hari ini membuktikan ketaatan kita kepada Sang Pencipta.`,
    };
  }

  return {
    reply: `Horas ${name}! Senang bisa mendampingimu di Marsiadapari Hijau. Sebagai jemaat dan civitas ${context.community || 'IAKN Tarutung'}, setiap langkah kecilmu merawat alam—dari memilah sampah, menghemat listrik hingga menanam bibit pohon—adalah ungkapan syukur kepada Allah. Ada yang ingin kamu diskusikan tentang aksi lingkunganmu hari ini? [REKOMENDASI: Pilah Sampah]`,
  };
}
