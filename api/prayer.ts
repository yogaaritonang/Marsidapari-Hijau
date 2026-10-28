import type { Request, Response } from 'express';
import { getGeminiClient, GEMINI_MODEL } from './geminiClient.js';

export interface PrayerRequestBody {
  type: 'doa_singkat' | 'doa_syukur_panen' | 'liturgi_minggu_ciptaan';
  theme: string;
  duration?: string; // e.g. "5 menit", "15 menit", "Ibadah Lengkap"
  congregation?: string;
}

export interface PrayerResponse {
  title: string;
  theme: string;
  type: string;
  bible_verse: string;
  content: string; // Structured text with headings, liturgical responses, prayers
  instructions?: string;
}

export default async function prayerHandler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, theme, duration = 'Singkat', congregation = 'IAKN Tarutung & HKBP' } = req.body as PrayerRequestBody;

  if (!theme) {
    return res.status(400).json({ error: 'Tema wajib dipilih atau diisi.' });
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.status(200).json(getSimulatedPrayer(type, theme, duration, congregation));
  }

  try {
    const promptText = `
Sebagai teolog Kristen dan liturgis gereja protestan di tanah Batak (konteks IAKN Tarutung, HKBP, GKPI dengan kearifan Danau Toba), buatkan naskah liturgi atau doa ciptaan:
Jenis: "${type}" (doa_singkat / doa_syukur_panen / liturgi_minggu_ciptaan)
Tema: "${theme}"
Estimasi Durasi: "${duration}"
Jemaat: "${congregation}"

Format yang diharapkan:
- Jika doa_singkat: Doa pribadi atau pembuka persekutuan yang khidmat memuji ciptaan dan memohon kekuatan merawat alam.
- Jika doa_syukur_panen: Doa syukur atas hasil bumi, padi di Silindung, kopi/tanaman di lereng Danau Toba, memohon berkat bagi petani dan kelestarian tanah air.
- Jika liturgi_minggu_ciptaan: Susunan tertib ibadah lengkap dengan Votum/Salam, Introitus Ciptaan, Nyanyian/Kidung Ciptaan (Buku Ende / Kidung Jemaat), Pengakuan Dosa terhadap Kerusakan Lingkungan, Janji Anugerah, Petunjuk Hidup Baru (Marsiadapari), Doa Syafaat Ekologis, dan Berkat.

KEMBALIKAN HANYA JSON MURNI:
{
  "title": "Judul Naskah",
  "theme": "${theme}",
  "type": "${type}",
  "bible_verse": "Ayat pembimbing",
  "content": "Isi lengkap doa/liturgi dalam teks terformat dengan rapi dan paragraf teratur",
  "instructions": "Petunjuk praktis bagi liturgis / pemimpin ibadah"
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

    const result: PrayerResponse = JSON.parse(text);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in /api/prayer:', error);
    return res.status(200).json(getSimulatedPrayer(type, theme, duration, congregation));
  }
}

function getSimulatedPrayer(type: string, theme: string, duration: string, congregation: string): PrayerResponse {
  if (type === 'liturgi_minggu_ciptaan') {
    return {
      title: `Tata Ibadah Minggu Ciptaan: ${theme}`,
      theme,
      type,
      bible_verse: 'Mazmur 24:1 - Tuhanlah yang empunya bumi serta segala isinya',
      instructions: 'Liturgi ini dapat dipimpin oleh Majelis Jemaat atau Dosen/Mahasiswa Teologi IAKN Tarutung.',
      content: `I. VOTUM & SALAM
Pemimpin (P): Di dalam nama Allah Bapa Pencipta langit dan bumi, Danau Toba dan lembah Silindung; di dalam nama Yesus Kristus yang memperdamaikan segala ciptaan; dan Roh Kudus yang membarui muka bumi. Amin.
Jemaat (J): Kasih karunia dan damai sejahtera menyertai kita sekalian.

II. INTROITUS & AJAKAN IBADAH
P: Sungguh amat baik segala yang dijadikan Allah (Kej 1:31). Udara sejuk Dolok Martimbang, gemercik Sungai Sigeaon, dan kemilau Danau Toba menceritakan kemuliaan-Nya.
J: Marilah kita memuji Tuhan bersama seluruh ciptaan!

III. PENGAKUAN DOSA EKOLOGIS
P: Ya Tuhan, kami mengaku bahwa seringkali tangan kami serakah. Kami mengotori air dengan sampah plastik, menebang pohon tanpa menanam kembali, dan melupakan panggilan gotong royong.
J: Kasihanilah kami, ya Tuhan. Ampunilah dosa kami terhadap sesama dan alam ciptaan-Mu.

IV. PETUNJUK HIDUP BARU - MARSIADAPARI HIJAU
P: Firman Tuhan dalam Kejadian 2:15: "Tuhan Allah mengambil manusia itu dan menempatkannya dalam taman Eden untuk mengusahakan dan memelihara taman itu." Bergotong royonglah kita merawat bumi ini setiap hari.

V. DOA SYAFAAT EKOLOGIS
(Doa untuk kelestarian Danau Toba, kesejahteraan petani, dan hikmat bagi civitas ${congregation}).

VI. BERKAT
P: Tuhan memberkati engkau dan melindungi tanah tempat engkau berpijak; damai sejahtera Kristus memenuhi hatimu untuk menjadi garam dan terang bagi bumi ciptaan-Nya. Amin.`,
    };
  }

  return {
    title: `Doa Ekologis: ${theme}`,
    theme,
    type,
    bible_verse: 'Kejadian 2:15 - Mengusahakan dan Memelihara',
    instructions: 'Dapat dibacakan saat mengawali hari atau sebelum memulai aksi gotong royong hijau.',
    content: `Ya Allah Bapa yang Mahakuasa, Khalik langit dan bumi,
Kami bersyukur atas anugerah fajar yang baru di Rura Silindung ini. Terima kasih atas embun pagi, perbukitan hijau, dan udara sejuk yang kami hirup.

Bapa, Engkau menempatkan kami di tanah Tapanuli ini bukan untuk merusaknya, melainkan untuk mengusahakan dan memeliharanya dengan penuh kasih. Ampunilah kelalaian kami manakala kami membiarkan sampah berserakan atau lalai menghemat sumber daya yang Engkau percayakan.

Penuhilah kami dengan Roh Kudus-Mu, agar semangat Marsiadapari—bergotong royong saling menolong—hidup dalam hati kami. Mampukan kami mahasiswa, pendeta, dan jemaat ${congregation} menjadi saksi kasih-Mu lewat aksi nyata: membawa tumbler, memilah sampah, dan menanam pohon kehidupan.

Di dalam nama Tuhan Yesus Kristus, Sang Penebus seluruh semesta, kami berdoa dan bersyukur.
Amin.`,
  };
}
