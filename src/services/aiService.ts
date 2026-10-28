import { VerifyResponsePayload } from '../../api/verify';
import { WasteScanResult } from '../../api/waste-scan';
import { GeneratedReflection } from '../../api/reflection';
import { PrayerResponse } from '../../api/prayer';

/**
 * AI Service for Marsiadapari Hijau
 * Calls serverless functions at /api/* and uses contextual simulations only
 * for non-verification features that do not award action points.
 */

export class AIService {
  static async verifyChallengeProof(
    image: string,
    challengeTitle: string,
    challengeCategory = 'Aksi Hijau',
    userNotes = ''
  ): Promise<{ data: VerifyResponsePayload; isFallback: boolean }> {
    let response: Response;
    try {
      response = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, challengeTitle, challengeCategory, userNotes }),
      });
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? 'Tidak dapat terhubung ke layanan verifikasi AI. Periksa koneksi internet dan coba lagi.'
          : 'Layanan verifikasi AI tidak dapat dijangkau. Coba lagi nanti.',
      );
    }

    const payload = await response.json().catch(() => null) as
      | VerifyResponsePayload
      | { error?: string }
      | null;
    if (!response.ok) {
      const message = payload && 'error' in payload && payload.error
        ? payload.error
        : 'Verifikasi AI gagal memeriksa gambar. Silakan coba lagi.';
      throw new Error(message);
    }
    if (!payload || !('verdict' in payload)) {
      throw new Error('Layanan AI mengirim hasil yang tidak valid. Foto belum diverifikasi.');
    }
    return { data: payload, isFallback: false };
  }

  static async sendChatMessage(
    message: string,
    history: Array<{ role: 'user' | 'model'; parts: string }>,
    context: { userName?: string; community?: string; points?: number; completedCount?: number }
  ): Promise<{ reply: string; isFallback: boolean }> {
    let response: Response;
    try {
      response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history, context }),
      });
    } catch {
      throw new Error('Tidak dapat terhubung ke chatbot AI. Periksa koneksi internet lalu coba lagi.');
    }

    const payload = await response.json().catch(() => null) as { reply?: string; error?: string } | null;
    if (!response.ok) {
      throw new Error(payload?.error || 'Chatbot AI gagal menjawab. Silakan coba lagi.');
    }
    if (!payload?.reply) throw new Error('Chatbot AI mengirim jawaban kosong. Silakan coba lagi.');
    return { reply: payload.reply, isFallback: false };
  }

  static async scanWaste(image: string): Promise<{ data: WasteScanResult; isFallback: boolean }> {
    try {
      const response = await fetch('/api/waste-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image }),
      });

      if (response.ok) {
        const data = await response.json();
        return { data, isFallback: false };
      }
    } catch {
      // Fallback
    }

    return {
      isFallback: true,
      data: {
        category: 'plastik',
        item_name: 'Botol Plastik Minuman PET',
        confidence: 90,
        how_to_sort: 'Lepaskan tutup dan label botol, bilas dengan sedikit air, lalu tekan hingga pipih.',
        how_to_recycle: 'Kumpulkan dan serahkan ke Bank Sampah terdekat untuk dicacah menjadi biji plastik daur ulang.',
        eco_impact_tip: 'Mencegah mikroplastik mencemari Danau Toba dan biota air tawar endemik.',
        nearest_facility_suggestion: 'Bank Sampah Induk Tarutung & Bank Sampah IAKN Sipoholon',
      },
    };
  }

  static async generateReflection(
    topicOrMood: string,
    userName?: string,
    community?: string
  ): Promise<{ data: GeneratedReflection; isFallback: boolean }> {
    try {
      const response = await fetch('/api/reflection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicOrMood, userName, community }),
      });

      if (response.ok) {
        const data = await response.json();
        return { data, isFallback: false };
      }
    } catch {
      // Fallback
    }

    return {
      isFallback: true,
      data: {
        title: `Embun Kasih di Rura Silindung: ${topicOrMood}`,
        scripture: 'Kejadian 2:15',
        verse_text: 'Tuhan Allah mengambil manusia itu dan menempatkannya dalam taman Eden untuk mengusahakan dan memelihara taman itu.',
        body: `Di tengah rasa ${topicOrMood} yang kita alami hari ini, pandanglah sekeliling kita. Allah yang menata lembah Silindung dengan perbukitan hijau memanggil kita bukan untuk memikul beban seorang diri, melainkan bersekutu dalam kasih. Mandat memelihara ciptaan (Kej 2:15) adalah panggilan pemulihan jiwa: saat kita merawat sebutir benih atau sejuknya air, kita sedang bersentuhan dengan kehangatan kasih Allah Sang Khalik.`,
        call_to_action: 'Ambil waktu sejenak di pekarangan, siram tanaman terdekat, dan ucapkan terima kasih kepada Tuhan atas udara segar hari ini.',
        batak_wisdom: 'Marsiadapari mamparbuehon denggan: Kerja bersama yang tulus melahirkan buah kedamaian.',
        suggested_challenge: 'Hemat Air Hari Ini',
        reading_time_minutes: 1,
      },
    };
  }

  static async generatePrayer(
    type: 'doa_singkat' | 'doa_syukur_panen' | 'liturgi_minggu_ciptaan',
    theme: string,
    duration = 'Singkat',
    congregation = 'IAKN Tarutung & HKBP'
  ): Promise<{ data: PrayerResponse; isFallback: boolean }> {
    try {
      const response = await fetch('/api/prayer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, theme, duration, congregation }),
      });

      if (response.ok) {
        const data = await response.json();
        return { data, isFallback: false };
      }
    } catch {
      // Fallback
    }

    if (type === 'liturgi_minggu_ciptaan') {
      return {
        isFallback: true,
        data: {
          title: `Tata Ibadah Minggu Ciptaan: ${theme}`,
          theme,
          type,
          bible_verse: 'Mazmur 24:1 - Tuhanlah yang empunya bumi serta segala isinya',
          instructions: 'Liturgi ramah lingkungan untuk kebaktian Minggu di kampus IAKN atau persekutuan gereja.',
          content: `I. VOTUM & SALAM
P: Di dalam nama Allah Bapa Pencipta langit, bumi, lembah Silindung, dan Danau Toba; di dalam nama Yesus Kristus Sang Pembaru semesta; dan di dalam persekutuan Roh Kudus. Amin.
J: Amin. Kemuliaan bagi Allah di tempat yang mahatinggi.

II. INTROITUS MAZMUR 104
P: Betapa banyak karya-Mu, ya Tuhan, sekaliannya Kaujadikan dengan kebijaksanaan; bumi penuh dengan ciptaan-Mu!
J: Terpujilah Tuhan selama-lamanya!

III. PENGAKUAN DOSA EKOLOGIS
P: Ya Tuhan, kami sering lupa bahwa bumi ini adalah milik-Mu. Kami mencemari air dengan plastik, membiarkan sampah berserakan, dan tidak hemat energi.
J: Ampunilah kami ya Tuhan, berilah kami hati yang baru untuk merawat ciptaan-Mu.

IV. JANJI ANUGERAH & PETUNJUK HIDUP MARSIADAPARI
P: Kristus datang mendamaikan segala sesuatu, baik yang ada di bumi maupun yang di sorga (Kol 1:20). Mari bergotong royong menjaga kebersihan tanah kelahiran kita.

V. BERKAT
P: Kasih karunia Tuhan Yesus Kristus dan kasih Allah Bapa menyertai engkau dalam menjaga bumi ciptaan-Nya, hari ini sampai selama-lamanya. Amin.`,
        },
      };
    }

    return {
      isFallback: true,
      data: {
        title: `Doa Ciptaan: ${theme}`,
        theme,
        type,
        bible_verse: 'Kejadian 1:31 - Sungguh Amat Baik',
        instructions: 'Dapat dibacakan bersama sebelum memulai persekutuan atau aksi gotong royong hijau.',
        content: `Bapa Surgawi, Pencipta alam semesta yang agung,
Kami bersyukur atas keindahan tanah Tapanuli, atas sejuknya hawa perbukitan, serta air jernih yang terus mengalir memelihara kehidupan kami.

Hari ini kami berdoa khusus untuk tema "${theme}". Berikan kami hikmat dan kepekaan hati untuk tidak bersikap tamak terhadap alam ciptaan-Mu. Jadikanlah kami, mahasiswa dan jemaat ${congregation}, duta-duta pemulihan bumi yang setia: memungut sampah tanpa malu, membawa botol minum, menanam pohon, dan saling menyemangati dalam gotong royong Marsiadapari.

Di dalam nama Tuhan Yesus Kristus kami memanjatkan doa syukur ini.
Amin.`,
      },
    };
  }

  static async assistReport(
    title: string,
    rawNotes: string,
    category: string,
    locationName: string
  ): Promise<{ formalDescription: string; recommendedAction: string; urgency: string; isFallback: boolean }> {
    try {
      const response = await fetch('/api/report-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, rawNotes, category, locationName }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          formalDescription: data.formal_description,
          recommendedAction: data.recommended_action,
          urgency: data.urgency_level || 'Sedang',
          isFallback: false,
        };
      }
    } catch {
      // Fallback
    }

    return {
      formalDescription: `Laporan warga resmi mengenai temuan ${category} di sekitar ${locationName}. Terindikasi membutuhkan penanganan gotong royong segera untuk mencegah dampak ekologis yang lebih luas. Keterangan pelapor: "${rawNotes}"`,
      recommendedAction: 'Jadwalkan aksi Marsiadapari jemaat bersama pemuda dan sampaikan koordinasi ke pengelola lingkungan setempat.',
      urgency: 'Sedang',
      isFallback: true,
    };
  }
}
