import React, { useState } from 'react';
import {
  Award,
  Trash2,
  Trees,
  Droplet,
  Zap,
  Info,
  Share2,
  X,
  Compass,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { User } from '../types';
import { StorageService } from '../services/storageService';
import { ShareAchievementModal } from '../components/ShareAchievementModal';

interface ImpactPageProps {
  user: User;
  onOpenChallenge?: (challengeId?: string) => void;
}

export const ImpactPage: React.FC<ImpactPageProps> = ({ user, onOpenChallenge }) => {
  const [activeTab, setActiveTab] = useState<'dampak' | 'kalkulator'>('dampak');
  const [showHowCalculated, setShowHowCalculated] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const [shareToast, setShareToast] = useState(false);

  const [calcAnswers, setCalcAnswers] = useState({
    transport: 'angkot',
    electricity: 'hemat',
    food: 'lokal',
    plastic: 'tumbler',
  });
  const [quizFinished, setQuizFinished] = useState(false);

  const impact = StorageService.getUserImpact(user);

  const verifiedSubmissions = StorageService.getSubmissions().filter(
    (submission) => submission.userId === user.id && submission.verdict === 'valid',
  );
  const chartData = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const dailyPoints = verifiedSubmissions
      .filter((submission) => new Date(submission.submittedAt).toDateString() === date.toDateString())
      .reduce((total, submission) => total + submission.awardedPoints, 0);
    return {
      day: date.toLocaleDateString('id-ID', { weekday: 'short' }),
      poin: dailyPoints,
    };
  });
  const hasActivityData = chartData.some((day) => day.poin > 0);

  const badges = [
    {
      id: 'b-1',
      title: 'Pelestari Air',
      desc: 'Selesaikan aksi pembersihan perairan atau sungai Tapanuli',
      icon: '🌊',
      unlocked: impact.waterLiters >= 50,
    },
    {
      id: 'b-2',
      title: 'Pekebun Harapan Silindung',
      desc: 'Tanam minimal 1 bibit pohon hidup',
      icon: '🌱',
      unlocked: impact.trees >= 1,
    },
    {
      id: 'b-3',
      title: 'Penggerak Marsiadapari',
      desc: 'Kumpulkan lebih dari 100 poin gotong royong',
      icon: '🏆',
      unlocked: user.points >= 100,
    },
    {
      id: 'b-4',
      title: 'Bebas Sampah Plastik',
      desc: 'Cegah minimal 1 kg sampah plastik masuk lingkungan',
      icon: '🥤',
      unlocked: impact.wasteKg >= 1.0,
    },
  ];

  const handleShare = () => {
    const text = `🌿 Capaian Dampak Marsiadapari Hijau saya di IAKN Tarutung: ${impact.points} Poin Hijau, ${impact.wasteKg} kg sampah dicegah, ${impact.trees} pohon ditanam, dan ${impact.waterLiters} L air dihemat! Merawat ciptaan Tuhan, bergotong royong setiap hari.`;
    navigator.clipboard.writeText(text);
    setShareToast(true);
    setTimeout(() => setShareToast(false), 2500);
  };

  const calculateScore = () => {
    let score = 50;
    if (calcAnswers.transport === 'jalan') score += 15;
    if (calcAnswers.transport === 'angkot') score += 10;
    if (calcAnswers.transport === 'motor') score -= 10;

    if (calcAnswers.electricity === 'sangat_hemat') score += 15;
    if (calcAnswers.electricity === 'hemat') score += 10;
    if (calcAnswers.electricity === 'sering_lupa') score -= 10;

    if (calcAnswers.food === 'kebun_lokal') score += 15;
    if (calcAnswers.food === 'lokal') score += 10;
    if (calcAnswers.food === 'banyak_kemasan') score -= 10;

    if (calcAnswers.plastic === 'tumbler_tas') score += 15;
    if (calcAnswers.plastic === 'tumbler') score += 10;
    if (calcAnswers.plastic === 'sering_sekali_pakai') score -= 10;

    return Math.max(20, Math.min(98, score));
  };

  const footprintScore = calculateScore();

  return (
    <div className="space-y-4 pb-24 pt-2 px-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-[#7A5230] uppercase tracking-wider">
            Hasil Nyata Gotong Royong
          </span>
          <h2 className="text-lg font-bold font-poppins text-[#1F2A1F]">
            Dampak &amp; Jejak Hijau
          </h2>
        </div>

        <button
          onClick={() => setShowShareCard(true)}
          className="touch-target inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2E6B34] text-white text-xs font-bold hover:bg-[#235328] transition active:scale-95 shadow-xs"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Bagikan Kartu</span>
        </button>
      </div>

      <div className="flex p-1 bg-white rounded-2xl border border-gray-200 shadow-2xs">
        <button
          onClick={() => setActiveTab('dampak')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === 'dampak'
              ? 'bg-[#2E6B34] text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          📊 Dampak Saya
        </button>
        <button
          onClick={() => setActiveTab('kalkulator')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === 'kalkulator'
              ? 'bg-[#2E6B34] text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          🧭 Kalkulator Jejak Hijau
        </button>
      </div>

      {activeTab === 'dampak' ? (
        <>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-4 rounded-3xl bg-white border border-gray-200/90 shadow-xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">
                  Sampah Dikurangi
                </span>
                <span className="text-base font-extrabold text-[#1F2A1F]">
                  {impact.wasteKg} kg
                </span>
                <span className="text-[10px] text-emerald-700 block mt-0.5">
                  &bull; Berdasarkan bukti terverifikasi
                </span>
              </div>
            </div>

            <div className="p-4 rounded-3xl bg-white border border-gray-200/90 shadow-xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-green-50 text-green-800 flex items-center justify-center shrink-0">
                <Trees className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">
                  Pohon Tertanam
                </span>
                <span className="text-base font-extrabold text-[#1F2A1F]">
                  {impact.trees} Pohon
                </span>
                <span className="text-[10px] text-green-800 block mt-0.5">
                  &bull; Aksi menanam terverifikasi
                </span>
              </div>
            </div>

            <div className="p-4 rounded-3xl bg-white border border-gray-200/90 shadow-xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-cyan-50 text-cyan-700 flex items-center justify-center shrink-0">
                <Droplet className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">
                  Air Dihemat
                </span>
                <span className="text-base font-extrabold text-[#1F2A1F]">
                  {impact.waterLiters} Liter
                </span>
                <span className="text-[10px] text-cyan-700 block mt-0.5">
                  &bull; Mata air Silindung
                </span>
              </div>
            </div>

            <div className="p-4 rounded-3xl bg-white border border-gray-200/90 shadow-xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">
                  Listrik Dihemat
                </span>
                <span className="text-base font-extrabold text-[#1F2A1F]">
                  {impact.electricityKwh} kWh
                </span>
                <span className="text-[10px] text-amber-700 block mt-0.5">
                  &bull; Hemat biaya energi
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white border border-[#2E6B34]/20 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold font-poppins text-[#1F2A1F]">
                  Grafik Aktivitas Gotong Royong Mingguan
                </h3>
                <p className="text-[10px] text-gray-500">
                  Poin Hijau yang diperoleh setiap hari
                </p>
              </div>
              <button
                onClick={() => setShowHowCalculated(true)}
                className="text-[11px] text-[#2E6B34] font-bold flex items-center gap-1 hover:underline"
              >
                <Info className="w-3.5 h-3.5" />
                <span>Cara Hitung</span>
              </button>
            </div>

            {hasActivityData ? (
              <div className="h-44 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FAF6EC',
                        borderColor: '#2E6B34',
                        borderRadius: '12px',
                        fontSize: '11px',
                      }}
                    />
                    <Bar dataKey="poin" fill="#2E6B34" radius={[6, 6, 0, 0]} name="Poin Diperoleh" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="rounded-2xl bg-gray-50 p-5 text-center text-xs text-gray-500">
                Grafik akan muncul setelah ada aksi yang berhasil diverifikasi.
              </p>
            )}
          </div>

          <div className="rounded-3xl bg-white border border-gray-200/90 p-4 shadow-xs space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#7A5230] font-poppins">
              Lencana Pencapaian
            </h3>

            <div className="grid grid-cols-2 gap-2">
              {badges.map((badge) => (
                <div
                  key={badge.id}
                  className={`p-3 rounded-2xl border transition ${
                    badge.unlocked
                      ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 shadow-2xs'
                      : 'bg-gray-50 border-gray-200 text-gray-400 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{badge.icon}</span>
                    <span className="text-xs font-bold leading-tight">
                      {badge.title}
                    </span>
                  </div>
                  <p className="text-[10px] leading-tight">
                    {badge.desc}
                  </p>
                  <span
                    className={`mt-1.5 inline-block text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      badge.unlocked
                        ? 'bg-[#2E6B34] text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {badge.unlocked ? 'Tercapai 🌿' : 'Terkunci'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-3xl bg-white border border-[#2E6B34]/25 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#2E6B34] text-white flex items-center justify-center">
              <Compass className="w-5 h-5 text-[#A8D5A2]" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-poppins text-[#1F2A1F]">
                Kuis Jejak Hijau Silindung
              </h3>
              <p className="text-[11px] text-gray-500">
                4 pertanyaan singkat untuk mengukur jejak karbon dan gaya hidup ramah lingkungan
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-[#FAF6EC] rounded-2xl border border-gray-200 space-y-1.5">
              <span className="font-bold text-gray-800 block">
                1. Transportasi harian ke kampus IAKN / gereja:
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'jalan', label: 'Jalan Kaki' },
                  { id: 'angkot', label: 'Angkot' },
                  { id: 'motor', label: 'Motor Pribadi' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setCalcAnswers({ ...calcAnswers, transport: opt.id })}
                    className={`p-2 rounded-xl text-center font-semibold transition ${
                      calcAnswers.transport === opt.id
                        ? 'bg-[#2E6B34] text-white'
                        : 'bg-white border text-gray-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 bg-[#FAF6EC] rounded-2xl border border-gray-200 space-y-1.5">
              <span className="font-bold text-gray-800 block">
                2. Kebiasaan mematikan lampu &amp; cabut colokan:
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'sangat_hemat', label: 'Selalu Cabut' },
                  { id: 'hemat', label: 'Cukup Hemat' },
                  { id: 'sering_lupa', label: 'Sering Lupa' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setCalcAnswers({ ...calcAnswers, electricity: opt.id })}
                    className={`p-2 rounded-xl text-center font-semibold transition ${
                      calcAnswers.electricity === opt.id
                        ? 'bg-[#2E6B34] text-white'
                        : 'bg-white border text-gray-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 bg-[#FAF6EC] rounded-2xl border border-gray-200 space-y-1.5">
              <span className="font-bold text-gray-800 block">
                3. Konsumsi bahan pangan harian:
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'kebun_lokal', label: 'Kebun Sendiri' },
                  { id: 'lokal', label: 'Pasar Tradisional' },
                  { id: 'banyak_kemasan', label: 'Banyak Kemasan' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setCalcAnswers({ ...calcAnswers, food: opt.id })}
                    className={`p-2 rounded-xl text-center font-semibold transition ${
                      calcAnswers.food === opt.id
                        ? 'bg-[#2E6B34] text-white'
                        : 'bg-white border text-gray-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 bg-[#FAF6EC] rounded-2xl border border-gray-200 space-y-1.5">
              <span className="font-bold text-gray-800 block">
                4. Penggunaan botol &amp; kantong plastik sekali pakai:
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'tumbler_tas', label: 'Selalu Bawa' },
                  { id: 'tumbler', label: 'Bawa Tumbler' },
                  { id: 'sering_sekali_pakai', label: 'Sering Pakai' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setCalcAnswers({ ...calcAnswers, plastic: opt.id })}
                    className={`p-2 rounded-xl text-center font-semibold transition ${
                      calcAnswers.plastic === opt.id
                        ? 'bg-[#2E6B34] text-white'
                        : 'bg-white border text-gray-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setQuizFinished(true)}
            className="w-full py-2.5 rounded-xl bg-[#2E6B34] text-white text-xs font-bold hover:bg-[#235328] transition active:scale-95 shadow-md flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Lihat Skor &amp; Rekomendasi Tantangan</span>
          </button>

          {quizFinished && (
            <div className="pt-3 border-t border-gray-200 space-y-3 animate-in fade-in duration-300">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-center space-y-1">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest">
                  Skor Indeks Ramah Lingkungan
                </span>
                <div className="text-3xl font-extrabold text-[#2E6B34] font-poppins">
                  {footprintScore} / 100
                </div>
                <p className="text-xs text-gray-700 font-medium">
                  {footprintScore >= 75
                    ? '🌿 Sangat Baik! Anda adalah teladan penjaga ciptaan di Tapanuli Utara.'
                    : footprintScore >= 50
                    ? '🌱 Baik! Ada beberapa langkah kecil yang bisa terus ditingkatkan.'
                    : '⚠️ Mari mulai kebiasaan baru lewat tantangan sederhana harian.'}
                </p>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-bold text-gray-800 block">
                  3 Rekomendasi Tantangan Sesuai Pola Hidup Anda:
                </span>
                <div className="space-y-1.5">
                  {[
                    { id: 'chal-tumbler', title: 'Bawa Tumbler & Tolak Botol Sekali Pakai', pts: 15 },
                    { id: 'chal-hemat-listrik', title: 'Padamkan Lampu & Alat Elektronik Standby', pts: 15 },
                    { id: 'chal-tanam-pohon', title: 'Tanam Satu Pohon / Tunas Harapan', pts: 60 },
                  ].map((rec) => (
                    <div
                      key={rec.id}
                      onClick={() => onOpenChallenge && onOpenChallenge(rec.id)}
                      className="cursor-pointer p-2.5 rounded-xl bg-white border border-gray-200 hover:border-[#2E6B34] flex items-center justify-between text-xs transition"
                    >
                      <span className="font-semibold text-gray-800">{rec.title}</span>
                      <span className="font-bold text-[#2E6B34] shrink-0">+{rec.pts} Pts</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-[#FAF6EC] rounded-2xl border-l-3 border-[#2E6B34] text-xs text-gray-700 italic">
                "Barangsiapa setia dalam perkara-perkara kecil, ia setia juga dalam perkara-perkara besar." (Lukas 16:10a)
              </div>
            </div>
          )}
        </div>
      )}

      {shareToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[#1F2A1F] text-white px-4 py-2 rounded-full text-xs font-semibold shadow-lg">
          Teks kartu dampak berhasil disalin ke clipboard!
        </div>
      )}

      {showHowCalculated && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-[#FAF6EC] border border-[#2E6B34]/25 p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="text-sm font-bold font-poppins text-[#2E6B34]">
                Bagaimana Dampak Dihitung?
              </h3>
              <button
                onClick={() => setShowHowCalculated(false)}
                className="p-1 text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-gray-700 space-y-2 max-h-72 overflow-y-auto">
              <p>
                Angka capaian lingkungan di aplikasi ini adalah <strong>estimasi saintifik berbasis aksi</strong> yang diverifikasi:
              </p>
              <div className="space-y-1.5 bg-white p-3 rounded-2xl border border-gray-200">
                <div>
                  <strong>&bull; 1x Bawa Tumbler:</strong> Menghemat ~0.1 kg sampah plastik botol sekali pakai.
                </div>
                <div>
                  <strong>&bull; 1x Tanam Bibit Pohon:</strong> Menyerap estimasi ~22 kg CO₂/tahun saat dewasa dan menjaga 100 L air tanah.
                </div>
                <div>
                  <strong>&bull; 1x Hemat Air Bersih:</strong> Mengurangi pemborosan ~15-25 liter air pegunungan Silindung.
                </div>
                <div>
                  <strong>&bull; 1x Matikan Listrik Standby:</strong> Menghemat ~1.2 kWh listrik/hari.
                </div>
              </div>
              <p className="text-[11px] text-gray-500 italic">
                *Semua angka adalah perkiraan acuan edukasi ekoteologis agar jemaat dapat merasakan dampak nyata dari gotong royong sehari-hari.
              </p>
            </div>

            <button
              onClick={() => setShowHowCalculated(false)}
              className="w-full py-2.5 rounded-xl bg-[#2E6B34] text-white text-xs font-bold"
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      )}

      <ShareAchievementModal
        isOpen={showShareCard}
        onClose={() => setShowShareCard(false)}
        payload={{
          name: user.name,
          points: user.points,
          communityName: user.communityName,
          trees: impact.trees,
          wasteKg: impact.wasteKg,
        }}
      />
    </div>
  );
};
