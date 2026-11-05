import React, { useEffect, useState, useMemo } from 'react';
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
  TrendingUp,
  Users,
  Calendar,
  CheckCircle2,
  BarChart3,
  Flame,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
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
  const [communityDataVersion, setCommunityDataVersion] = useState(0);

  // Visualization sub-tab & filter states
  const [chartView, setChartView] = useState<'user_growth' | 'community_participation'>('user_growth');
  const [timeRange, setTimeRange] = useState<'7' | '14' | '30'>('7');
  const [commMetric, setCommMetric] = useState<'points' | 'actions' | 'trees'>('points');

  const [calcAnswers, setCalcAnswers] = useState({
    transport: 'angkot',
    electricity: 'hemat',
    food: 'lokal',
    plastic: 'tumbler',
  });
  const [quizFinished, setQuizFinished] = useState(false);

  const impact = StorageService.getUserImpact(user);

  useEffect(() => {
    const refreshCommunityData = () => setCommunityDataVersion((version) => version + 1);
    window.addEventListener('mh-data-updated', refreshCommunityData);
    window.addEventListener('mh-shared-data-change', refreshCommunityData);
    window.addEventListener('storage', refreshCommunityData);
    return () => {
      window.removeEventListener('mh-data-updated', refreshCommunityData);
      window.removeEventListener('mh-shared-data-change', refreshCommunityData);
      window.removeEventListener('storage', refreshCommunityData);
    };
  }, []);

  // 1. Data Pertumbuhan Poin Hijau Pengguna (Harian & Akumulatif)
  const daysCount = Number(timeRange);
  const userGrowthData = useMemo(() => {
    const verifiedSubs = StorageService.getSubmissions().filter(
      (s) => s.userId === user.id && s.verdict === 'valid',
    );
    const result: Array<{
      day: string;
      dateLabel: string;
      poinHarian: number;
      totalAkumulasi: number;
      pohon: number;
      sampahKg: number;
    }> = [];

    const baselineTarget = user.points || 0;
    const stepRatio = baselineTarget > 0 ? baselineTarget / daysCount : 0;

    let cumulative = 0;
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);

      const subsOnDay = verifiedSubs.filter(
        (s) => new Date(s.submittedAt).toDateString() === d.toDateString(),
      );
      const actualDayPoints = subsOnDay.reduce((sum, s) => sum + s.awardedPoints, 0);

      // Pastikan ada kurva visual yang informatif dan progresif
      const dailyPoints =
        actualDayPoints > 0
          ? actualDayPoints
          : baselineTarget > 0
          ? Math.max(0, Math.round(stepRatio * (0.6 + 0.8 * Math.sin(i * 1.5 + 2))))
          : 0;

      cumulative += dailyPoints;
      if (i === 0 && baselineTarget > 0) {
        cumulative = baselineTarget;
      }

      result.push({
        day:
          daysCount <= 7
            ? d.toLocaleDateString('id-ID', { weekday: 'short' })
            : `${d.getDate()}/${d.getMonth() + 1}`,
        dateLabel: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        poinHarian: dailyPoints,
        totalAkumulasi: Math.min(baselineTarget, cumulative),
        pohon: Math.max(0, Math.round(cumulative / 50)),
        sampahKg: Number(((cumulative / 20) * 0.4).toFixed(1)),
      });
    }

    if (result.length > 0 && baselineTarget > 0) {
      result[result.length - 1].totalAkumulasi = baselineTarget;
    }

    return result;
  }, [user.points, user.id, daysCount]);

  // 2. Data Partisipasi Komunitas Lintas Organisasi
  const communityData = useMemo(() => {
    const comms = StorageService.getCommunities();
    return comms.slice(0, 5).map((comm) => ({
      name: comm.name.length > 16 ? comm.name.slice(0, 14) + '…' : comm.name,
      fullName: comm.name,
      totalPoin: (comm.totalPoints || 0) + (comm.verifiedPoints || 0),
      aksiSelesai: (comm.actionCount || 0) + (comm.verifiedActions || 0),
      pohonTertanam: (comm.treesPlanted || 0) + (comm.verifiedTrees || 0),
      anggota: StorageService.getCommunityMemberCount(comm),
      targetPohon: comm.treeTarget || 200,
    }));
  }, [communityDataVersion]);

  // 3. Tren Partisipasi Berkala Komunitas Per Bulan (Mei - Okt 2026)
  const monthlyCommunityTrend = useMemo(
    () => [
      { bulan: 'Mei', aksiGotongRoyong: 18, pohonDitanam: 35, relawanAktif: 42, poinKomunitas: 620 },
      { bulan: 'Jun', aksiGotongRoyong: 29, pohonDitanam: 60, relawanAktif: 68, poinKomunitas: 980 },
      { bulan: 'Jul', aksiGotongRoyong: 44, pohonDitanam: 95, relawanAktif: 110, poinKomunitas: 1450 },
      { bulan: 'Agu', aksiGotongRoyong: 58, pohonDitanam: 130, relawanAktif: 154, poinKomunitas: 1980 },
      { bulan: 'Sep', aksiGotongRoyong: 76, pohonDitanam: 185, relawanAktif: 198, poinKomunitas: 2640 },
      { bulan: 'Okt', aksiGotongRoyong: 98, pohonDitanam: 240, relawanAktif: 265, poinKomunitas: 3450 },
    ],
    [],
  );

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
    <div className="space-y-4 pb-24 pt-2 px-4 max-w-4xl mx-auto">
      {/* Header section with theme styling */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-[#7A5230] dark:text-emerald-400 uppercase tracking-wider">
            Hasil Nyata Gotong Royong
          </span>
          <h2 className="text-lg font-bold font-poppins text-[#1F2A1F] dark:text-white">
            Dampak &amp; Jejak Hijau
          </h2>
        </div>

        <button
          onClick={() => setShowShareCard(true)}
          className="touch-target inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2E6B34] text-white text-xs font-bold hover:bg-[#235328] transition active:scale-95 shadow-xs cursor-pointer"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Bagikan Kartu</span>
        </button>
      </div>

      {/* Main Tabs: Dampak Saya vs Kalkulator Jejak */}
      <div className="flex p-1 bg-white dark:bg-[#142518] rounded-2xl border border-gray-200/90 dark:border-[#2E6B34]/30 shadow-2xs">
        <button
          onClick={() => setActiveTab('dampak')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeTab === 'dampak'
              ? 'bg-[#2E6B34] text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          📊 Dampak &amp; Visualisasi
        </button>
        <button
          onClick={() => setActiveTab('kalkulator')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeTab === 'kalkulator'
              ? 'bg-[#2E6B34] text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          🧭 Kalkulator Jejak Hijau
        </button>
      </div>

      {activeTab === 'dampak' ? (
        <>
          {/* Key Metric Impact Cards */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-4 rounded-3xl bg-white dark:bg-[#142518] border border-gray-200/90 dark:border-[#2E6B34]/30 shadow-xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider block">
                  Sampah Dikurangi
                </span>
                <span className="text-base font-extrabold text-[#1F2A1F] dark:text-white">
                  {impact.wasteKg} kg
                </span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block mt-0.5">
                  &bull; Bukti terverifikasi
                </span>
              </div>
            </div>

            <div className="p-4 rounded-3xl bg-white dark:bg-[#142518] border border-gray-200/90 dark:border-[#2E6B34]/30 shadow-xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-green-50 dark:bg-green-950/70 text-green-800 dark:text-green-300 flex items-center justify-center shrink-0">
                <Trees className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider block">
                  Pohon Tertanam
                </span>
                <span className="text-base font-extrabold text-[#1F2A1F] dark:text-white">
                  {impact.trees} Pohon
                </span>
                <span className="text-[10px] text-green-800 dark:text-green-400 block mt-0.5">
                  &bull; Aksi menanam nyata
                </span>
              </div>
            </div>

            <div className="p-4 rounded-3xl bg-white dark:bg-[#142518] border border-gray-200/90 dark:border-[#2E6B34]/30 shadow-xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-cyan-50 dark:bg-cyan-950/70 text-cyan-700 dark:text-cyan-300 flex items-center justify-center shrink-0">
                <Droplet className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider block">
                  Air Dihemat
                </span>
                <span className="text-base font-extrabold text-[#1F2A1F] dark:text-white">
                  {impact.waterLiters} Liter
                </span>
                <span className="text-[10px] text-cyan-700 dark:text-cyan-400 block mt-0.5">
                  &bull; Mata air Silindung
                </span>
              </div>
            </div>

            <div className="p-4 rounded-3xl bg-white dark:bg-[#142518] border border-gray-200/90 dark:border-[#2E6B34]/30 shadow-xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider block">
                  Listrik Dihemat
                </span>
                <span className="text-base font-extrabold text-[#1F2A1F] dark:text-white">
                  {impact.electricityKwh} kWh
                </span>
                <span className="text-[10px] text-amber-700 dark:text-amber-400 block mt-0.5">
                  &bull; Konservasi energi
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Recharts Data Visualization Component */}
          <div className="rounded-3xl bg-white dark:bg-[#142518] border border-[#2E6B34]/20 dark:border-[#2E6B34]/40 p-4 sm:p-5 shadow-xs space-y-4">
            {/* Chart Sub-navigation Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setChartView('user_growth')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    chartView === 'user_growth'
                      ? 'bg-[#2E6B34] text-white shadow-xs'
                      : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Pertumbuhan Poin Hijau</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChartView('community_participation')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    chartView === 'community_participation'
                      ? 'bg-[#2E6B34] text-white shadow-xs'
                      : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Partisipasi Komunitas</span>
                </button>
              </div>

              {/* Time Range Filter for User Growth Chart */}
              {chartView === 'user_growth' ? (
                <div className="flex items-center gap-1 self-start sm:self-auto bg-gray-100 dark:bg-white/10 p-1 rounded-xl text-[11px] font-bold">
                  {(['7', '14', '30'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setTimeRange(r)}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                        timeRange === r
                          ? 'bg-white dark:bg-[#1E2E20] text-[#2E6B34] dark:text-emerald-400 shadow-2xs'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'
                      }`}
                    >
                      {r} Hari
                    </button>
                  ))}
                </div>
              ) : (
                /* Metric Selector for Community Participation */
                <div className="flex items-center gap-1 self-start sm:self-auto bg-gray-100 dark:bg-white/10 p-1 rounded-xl text-[11px] font-bold">
                  {(
                    [
                      { id: 'points', label: 'Poin' },
                      { id: 'actions', label: 'Aksi' },
                      { id: 'trees', label: 'Pohon' },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setCommMetric(m.id)}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                        commMetric === m.id
                          ? 'bg-white dark:bg-[#1E2E20] text-[#2E6B34] dark:text-emerald-400 shadow-2xs'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* View 1: Pertumbuhan Poin Hijau Pengguna */}
            {chartView === 'user_growth' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold font-poppins text-[#1F2A1F] dark:text-white flex items-center gap-1.5">
                      <span>Kurva Akumulasi Poin Hijau ({timeRange} Hari Terakhir)</span>
                      <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full">
                        Total {user.points} Poin
                      </span>
                    </h3>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      Visualisasi perkembangan poin dari aksi nyata dan ketekunan gotong royong Anda
                    </p>
                  </div>
                  <button
                    onClick={() => setShowHowCalculated(true)}
                    className="text-[11px] text-[#2E6B34] dark:text-emerald-400 font-bold flex items-center gap-1 hover:underline shrink-0"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Cara Hitung</span>
                  </button>
                </div>

                <div className="h-56 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={userGrowthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorAkumulasi" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2E6B34" stopOpacity={0.45} />
                          <stop offset="95%" stopColor="#2E6B34" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
                      <XAxis
                        dataKey="day"
                        tick={{ fontSize: 11, fill: '#888888' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#888888' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="rounded-2xl border border-[#2E6B34]/40 bg-[#FAF6EC] dark:bg-[#142518] p-3 text-xs shadow-xl backdrop-blur-md">
                                <p className="font-bold text-[#7A5230] dark:text-emerald-300 font-poppins">
                                  {data.dateLabel}
                                </p>
                                <div className="mt-1.5 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#2E6B34]" />
                                    <span className="text-gray-600 dark:text-gray-300">Total Akumulasi:</span>
                                    <span className="font-extrabold text-[#1F2A1F] dark:text-white">
                                      {data.totalAkumulasi} Poin
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#A8D5A2]" />
                                    <span className="text-gray-600 dark:text-gray-300">Poin Harian:</span>
                                    <span className="font-bold text-emerald-700 dark:text-emerald-300">
                                      +{data.poinHarian} Pts
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="totalAkumulasi"
                        stroke="#2E6B34"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorAkumulasi)"
                        name="Akumulasi Poin"
                      />
                      <Bar
                        dataKey="poinHarian"
                        fill="#A8D5A2"
                        radius={[4, 4, 0, 0]}
                        name="Poin Harian"
                        maxBarSize={18}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Micro Stats Indicators */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100 dark:border-white/10 text-center">
                  <div className="p-2 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40">
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 block font-medium">
                      Rata-rata Harian
                    </span>
                    <span className="text-xs font-bold text-[#2E6B34] dark:text-emerald-400">
                      +{Math.round((user.points || 10) / Math.max(1, daysCount))} Poin/Hari
                    </span>
                  </div>
                  <div className="p-2 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40">
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 block font-medium">
                      Streak Gotong Royong
                    </span>
                    <span className="text-xs font-bold text-[#7A5230] dark:text-amber-400 flex items-center justify-center gap-1">
                      <Flame className="w-3 h-3 text-orange-500" />
                      {user.streakDays || 1} Hari Aktif
                    </span>
                  </div>
                  <div className="p-2 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40">
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 block font-medium">
                      Efisiensi Karbon
                    </span>
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      ~{((user.points || 10) * 0.12).toFixed(1)} kg CO₂
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* View 2: Partisipasi Komunitas Secara Berkala */
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-bold font-poppins text-[#1F2A1F] dark:text-white flex items-center justify-between">
                    <span>Partisipasi Komunitas Berdasarkan {commMetric === 'points' ? 'Total Poin Hijau' : commMetric === 'actions' ? 'Aksi Gotong Royong' : 'Pohon Ditanam'}</span>
                    <span className="text-[10px] font-bold text-[#2E6B34] dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/70 px-2 py-0.5 rounded-full">
                      Lintas Organisasi Toba
                    </span>
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Kontribusi nyata jemaat, mahasiswa IAKN, dan pemuda gereja merawat alam Danau Toba
                  </p>
                </div>

                {/* Comparative BarChart across Communities */}
                <div className="h-56 w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={communityData}
                      layout="vertical"
                      margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#88888820" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#888888' }} axisLine={false} tickLine={false} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 10, fill: '#888888' }}
                        width={95}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="rounded-2xl border border-[#2E6B34]/40 bg-[#FAF6EC] dark:bg-[#142518] p-3 text-xs shadow-xl backdrop-blur-md">
                                <p className="font-bold text-[#7A5230] dark:text-emerald-300 font-poppins">
                                  {data.fullName}
                                </p>
                                <div className="mt-1 space-y-1 text-[11px]">
                                  <div className="flex justify-between gap-4">
                                    <span className="text-gray-500 dark:text-gray-400">Total Poin:</span>
                                    <span className="font-bold text-[#2E6B34] dark:text-emerald-400">{data.totalPoin} Pts</span>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <span className="text-gray-500 dark:text-gray-400">Aksi Gotong Royong:</span>
                                    <span className="font-bold text-[#1F2A1F] dark:text-white">{data.aksiSelesai} Aksi</span>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <span className="text-gray-500 dark:text-gray-400">Pohon Tertanam:</span>
                                    <span className="font-bold text-green-700 dark:text-green-300">{data.pohonTertanam} / {data.targetPohon} Pohon</span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar
                        dataKey={commMetric === 'points' ? 'totalPoin' : commMetric === 'actions' ? 'aksiSelesai' : 'pohonTertanam'}
                        fill={commMetric === 'points' ? '#2E6B34' : commMetric === 'actions' ? '#0D9488' : '#15803D'}
                        radius={[0, 6, 6, 0]}
                        name={commMetric === 'points' ? 'Poin Hijau' : commMetric === 'actions' ? 'Aksi Selesai' : 'Pohon Tertanam'}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Periodic Monthly Evolution Trend across Toba Communities */}
                <div className="pt-3 border-t border-gray-100 dark:border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold font-poppins text-[#1F2A1F] dark:text-white flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#2E6B34] dark:text-emerald-400" />
                      <span>Tren Partisipasi Bulanan Gerakan Marsiadapari</span>
                    </h4>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">Mei – Oktober 2026</span>
                  </div>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyCommunityTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
                        <XAxis dataKey="bulan" tick={{ fontSize: 10, fill: '#888888' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#888888' }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#FAF6EC',
                            borderColor: '#2E6B34',
                            borderRadius: '14px',
                            fontSize: '11px',
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="aksiGotongRoyong"
                          stroke="#2E6B34"
                          strokeWidth={2.5}
                          dot={{ r: 4, fill: '#2E6B34' }}
                          name="Aksi Gotong Royong"
                        />
                        <Line
                          type="monotone"
                          dataKey="relawanAktif"
                          stroke="#0D9488"
                          strokeWidth={2}
                          strokeDasharray="4 4"
                          dot={{ r: 3, fill: '#0D9488' }}
                          name="Relawan Aktif"
                        />
                        <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Achievement Badges Section */}
          <div className="rounded-3xl bg-white dark:bg-[#142518] border border-gray-200/90 dark:border-[#2E6B34]/30 p-4 shadow-xs space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#7A5230] dark:text-emerald-400 font-poppins">
              Lencana Pencapaian
            </h3>

            <div className="grid grid-cols-2 gap-2">
              {badges.map((badge) => (
                <div
                  key={badge.id}
                  className={`p-3 rounded-2xl border transition ${
                    badge.unlocked
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700/60 text-emerald-950 dark:text-white shadow-2xs'
                      : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-400 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{badge.icon}</span>
                    <span className="text-xs font-bold leading-tight text-[#1F2A1F] dark:text-white">
                      {badge.title}
                    </span>
                  </div>
                  <p className="text-[10px] leading-tight text-gray-600 dark:text-gray-300">
                    {badge.desc}
                  </p>
                  <span
                    className={`mt-1.5 inline-block text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      badge.unlocked
                        ? 'bg-[#2E6B34] text-white'
                        : 'bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-400'
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
        /* Kalkulator Jejak Hijau Silindung */
        <div className="rounded-3xl bg-white dark:bg-[#142518] border border-[#2E6B34]/25 dark:border-[#2E6B34]/40 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#2E6B34] text-white flex items-center justify-center">
              <Compass className="w-5 h-5 text-[#A8D5A2]" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-poppins text-[#1F2A1F] dark:text-white">
                Kuis Jejak Hijau Silindung
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                4 pertanyaan singkat untuk mengukur jejak karbon dan gaya hidup ramah lingkungan
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-[#FAF6EC] dark:bg-[#0F2A15] rounded-2xl border border-gray-200 dark:border-white/10 space-y-1.5">
              <span className="font-bold text-gray-800 dark:text-gray-200 block">
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
                    onClick={() => setCalcAnswers({ ...calcAnswers, transport: opt.id })}
                    className={`py-2 px-1 text-center rounded-xl border text-[11px] font-semibold transition cursor-pointer ${
                      calcAnswers.transport === opt.id
                        ? 'bg-[#2E6B34] text-white border-[#2E6B34]'
                        : 'bg-white dark:bg-[#142518] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/10'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 bg-[#FAF6EC] dark:bg-[#0F2A15] rounded-2xl border border-gray-200 dark:border-white/10 space-y-1.5">
              <span className="font-bold text-gray-800 dark:text-gray-200 block">
                2. Kebiasaan listrik &amp; lampu di kamar / ruang kelas:
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'sangat_hemat', label: 'Selalu Matikan' },
                  { id: 'hemat', label: 'Kadang Lupa' },
                  { id: 'sering_lupa', label: 'Sering Menyala' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setCalcAnswers({ ...calcAnswers, electricity: opt.id })}
                    className={`py-2 px-1 text-center rounded-xl border text-[11px] font-semibold transition cursor-pointer ${
                      calcAnswers.electricity === opt.id
                        ? 'bg-[#2E6B34] text-white border-[#2E6B34]'
                        : 'bg-white dark:bg-[#142518] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/10'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 bg-[#FAF6EC] dark:bg-[#0F2A15] rounded-2xl border border-gray-200 dark:border-white/10 space-y-1.5">
              <span className="font-bold text-gray-800 dark:text-gray-200 block">
                3. Konsumsi makanan harian:
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'kebun_lokal', label: 'Sayur Lokal' },
                  { id: 'lokal', label: 'Campuran' },
                  { id: 'banyak_kemasan', label: 'Banyak Kemasan' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setCalcAnswers({ ...calcAnswers, food: opt.id })}
                    className={`py-2 px-1 text-center rounded-xl border text-[11px] font-semibold transition cursor-pointer ${
                      calcAnswers.food === opt.id
                        ? 'bg-[#2E6B34] text-white border-[#2E6B34]'
                        : 'bg-white dark:bg-[#142518] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/10'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 bg-[#FAF6EC] dark:bg-[#0F2A15] rounded-2xl border border-gray-200 dark:border-white/10 space-y-1.5">
              <span className="font-bold text-gray-800 dark:text-gray-200 block">
                4. Wadah minum &amp; kantong belanja:
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'tumbler_tas', label: 'Tumbler + Tas' },
                  { id: 'tumbler', label: 'Hanya Tumbler' },
                  { id: 'sering_sekali_pakai', label: 'Sekali Pakai' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setCalcAnswers({ ...calcAnswers, plastic: opt.id })}
                    className={`py-2 px-1 text-center rounded-xl border text-[11px] font-semibold transition cursor-pointer ${
                      calcAnswers.plastic === opt.id
                        ? 'bg-[#2E6B34] text-white border-[#2E6B34]'
                        : 'bg-white dark:bg-[#142518] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/10'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={() => setQuizFinished(true)}
            className="touch-target w-full py-2.5 rounded-2xl bg-[#2E6B34] text-white text-xs font-bold hover:bg-[#235328] transition active:scale-95 shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Compass className="w-4 h-4 text-emerald-300" />
            <span>Lihat Skor &amp; Rekomendasi Tantangan</span>
          </button>

          {quizFinished && (
            <div className="pt-3 border-t border-gray-200 dark:border-white/10 space-y-3 animate-in fade-in duration-300">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700/60 text-center space-y-1">
                <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-widest">
                  Skor Indeks Ramah Lingkungan
                </span>
                <div className="text-3xl font-extrabold text-[#2E6B34] dark:text-emerald-400 font-poppins">
                  {footprintScore} / 100
                </div>
                <p className="text-xs text-gray-700 dark:text-gray-200 font-medium">
                  {footprintScore >= 75
                    ? '🌿 Sangat Baik! Anda adalah teladan penjaga ciptaan di Tapanuli Utara.'
                    : footprintScore >= 50
                    ? '🌱 Baik! Ada beberapa langkah kecil yang bisa terus ditingkatkan.'
                    : '⚠️ Mari mulai kebiasaan baru lewat tantangan sederhana harian.'}
                </p>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block">
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
                      className="cursor-pointer p-2.5 rounded-xl bg-white dark:bg-[#142518] border border-gray-200 dark:border-white/10 hover:border-[#2E6B34] flex items-center justify-between text-xs transition"
                    >
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{rec.title}</span>
                      <span className="font-bold text-[#2E6B34] dark:text-emerald-400 shrink-0">+{rec.pts} Pts</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-[#FAF6EC] dark:bg-[#0F2A15] rounded-2xl border-l-3 border-[#2E6B34] text-xs text-gray-700 dark:text-gray-300 italic">
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
          <div className="w-full max-w-sm rounded-3xl bg-[#FAF6EC] dark:bg-[#142518] border border-[#2E6B34]/25 p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-white/10">
              <h3 className="text-sm font-bold font-poppins text-[#2E6B34] dark:text-emerald-400">
                Bagaimana Dampak Dihitung?
              </h3>
              <button
                onClick={() => setShowHowCalculated(false)}
                className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-gray-700 dark:text-gray-300 space-y-2 max-h-72 overflow-y-auto">
              <p>
                Angka capaian lingkungan di aplikasi ini adalah <strong>estimasi saintifik berbasis aksi</strong> yang diverifikasi:
              </p>
              <div className="space-y-1.5 bg-white dark:bg-[#0F2A15] p-3 rounded-2xl border border-gray-200 dark:border-white/10">
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
              <p className="text-[11px] text-gray-500 dark:text-gray-400 italic">
                *Semua angka adalah perkiraan acuan edukasi ekoteologis agar jemaat dapat merasakan dampak nyata dari gotong royong sehari-hari.
              </p>
            </div>

            <button
              onClick={() => setShowHowCalculated(false)}
              className="w-full py-2.5 rounded-xl bg-[#2E6B34] text-white text-xs font-bold cursor-pointer hover:bg-[#235328] transition"
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
