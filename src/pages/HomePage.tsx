import React, { useState, useEffect } from 'react';
import {
  Flame,
  Camera,
  MapPin,
  BookOpen,
  Calendar,
  Sparkles,
  Trees,
  Droplet,
  Trash2,
  Zap,
  ArrowRight,
  Heart,
  ChevronRight,
  ScrollText,
  Trophy,
  Medal,
} from 'lucide-react';
import { User, Challenge, ChallengeSubmission } from '../types';
import { StorageService } from '../services/storageService';
import { BatakGorgaBorder } from '../components/BatakPattern';

interface HomePageProps {
  user: User;
  onNavigateTab: (tab: string) => void;
  onOpenVerifyModal: (challenge: Challenge) => void;
  onRequireAuth: () => void;
  onOpenDevotionDetail?: (devotionId: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  user,
  onNavigateTab,
  onOpenVerifyModal,
  onRequireAuth,
}) => {
  const [garden, setGarden] = useState(
    user.id === 'guest-preview' ? StorageService.getPreviewGarden() : StorageService.getGardenState(),
  );
  const [waterToast, setWaterToast] = useState<string | null>(null);
  const [, setDataVersion] = useState(0);

  // Dynamic User GPS Location State
  const [userLocation, setUserLocation] = useState<string>(() => {
    return localStorage.getItem('mh_user_gps_location') || 'Mendeteksi GPS...';
  });
  const [isLocating, setIsLocating] = useState(false);

  const detectUserLocation = () => {
    if (!navigator.geolocation) {
      setUserLocation('GPS Tidak Didukung');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          // Reverse geocoding via OpenStreetMap Nominatim
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14`,
            { headers: { 'Accept-Language': 'id,en' } }
          );
          if (res.ok) {
            const data = await res.json();
            const address = data.address || {};
            const cityOrDistrict =
              address.suburb ||
              address.village ||
              address.town ||
              address.city ||
              address.municipality ||
              address.county ||
              address.state_district ||
              'Tarutung, Toba';

            const locText = `${cityOrDistrict}`;
            setUserLocation(locText);
            localStorage.setItem('mh_user_gps_location', locText);
            return;
          }
        } catch {
          // If network / reverse geocoding is slow, show approximate coordinates
        }
        const fallbackText = `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`;
        setUserLocation(fallbackText);
        localStorage.setItem('mh_user_gps_location', fallbackText);
        setIsLocating(false);
      },
      (err) => {
        console.warn('Geolocation permission or error:', err.message);
        const existing = localStorage.getItem('mh_user_gps_location');
        if (!existing || existing === 'Mendeteksi GPS...') {
          setUserLocation('Tarutung, Tapanuli Utara');
        }
        setIsLocating(false);
      },
      { timeout: 7000, maximumAge: 60000 }
    );
  };

  useEffect(() => {
    detectUserLocation();
  }, []);

  useEffect(() => {
    if (user.id !== 'guest-preview') {
      StorageService.syncUserStreak(user);
    }

    const handleUpdate = () => {
      setDataVersion((v) => v + 1);
      if (user.id !== 'guest-preview') {
        setGarden(StorageService.getGardenState());
      }
    };
    window.addEventListener('mh-data-updated', handleUpdate);
    window.addEventListener('mh-brand-updated', handleUpdate);
    window.addEventListener('mh-shared-data-change', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('mh-data-updated', handleUpdate);
      window.removeEventListener('mh-brand-updated', handleUpdate);
      window.removeEventListener('mh-shared-data-change', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [user.id]);

  const brand = StorageService.getBrandSettings();
  const devotions = StorageService.getDevotions();
  const todayDevotion = StorageService.getTodayDevotion();
  const challenges = StorageService.getChallenges();
  const featuredChallenges = challenges.filter((c) => c.featured).slice(0, 3);
  const submissions = StorageService.getSubmissions().slice(0, 4);
  const userImpact = StorageService.getUserImpact(user);

  const handleWater = () => {
    if (user.id === 'guest-preview') {
      onRequireAuth();
      return;
    }
    const res = StorageService.waterPlant();
    setGarden(res.garden);
    setWaterToast(res.message);
    setTimeout(() => setWaterToast(null), 3000);
  };

  const isGuest = user.id === 'guest-preview';
  const hasActiveStreak = !isGuest && user.streakDays > 0;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 pb-28 pt-3 sm:space-y-5 sm:pt-4 md:pb-28 md:pt-6">
      {/* Horas Greeting Header */}
      <div className="px-4 pt-2 sm:px-6 lg:px-8">
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span className="text-[10px] sm:text-xs font-bold text-[#7A5230] uppercase tracking-wider bg-[#FAF6EC] px-2 py-0.5 rounded-md border border-[#2E6B34]/15">
                Horas ma di hita!
              </span>

              {/* Dynamic GPS user location indicator */}
              <button
                type="button"
                onClick={detectUserLocation}
                className="inline-flex items-center gap-1 rounded-full bg-white/90 border border-[#2E6B34]/20 px-2 py-0.5 text-[11px] text-gray-700 hover:text-[#2E6B34] transition shadow-2xs cursor-pointer group"
                title="Klik untuk memperbarui lokasi GPS Anda"
              >
                <MapPin className={`w-3 h-3 text-[#2E6B34] transition-transform ${isLocating ? 'animate-bounce' : 'group-hover:scale-110'}`} />
                <span className="font-semibold truncate max-w-[130px] sm:max-w-[200px]">{userLocation}</span>
                {isLocating && <span className="text-[9px] text-[#2E6B34] animate-pulse">...</span>}
              </button>
            </div>
            <h1 className="mt-0.5 font-poppins text-lg sm:text-2xl font-extrabold text-[#1F2A1F] truncate">
              Horas, {user.name}! 🌿
            </h1>
            <p className="text-[11px] sm:text-xs text-gray-600 mt-0.5 truncate">
              {user.id === 'guest-preview'
                ? 'Jelajahi gerakan merawat ciptaan bersama.'
                : <>Komunitas: <strong className="text-[#2E6B34]">{user.communityName}</strong></>}
            </p>
          </div>

          {/* Daily Streak Indicator */}
          <div
            onClick={() => {
              if (isGuest) {
                onRequireAuth();
              } else if (user.streakDays === 0) {
                onNavigateTab('challenges');
              } else {
                onNavigateTab('impact');
              }
            }}
            className={`cursor-pointer shrink-0 flex items-center gap-2 px-3 py-2 rounded-2xl transition duration-200 ${
              hasActiveStreak
                ? 'bg-gradient-to-r from-amber-100/90 to-orange-100/90 border border-orange-300 shadow-xs hover:border-orange-400 hover:shadow-sm'
                : 'bg-amber-50/80 border border-amber-200/80 shadow-xs hover:bg-amber-100/80'
            }`}
            title={
              isGuest
                ? 'Masuk untuk mengaktifkan streak aksi berturut-turut'
                : hasActiveStreak
                ? `Streak Aktif: ${user.streakDays} hari berturut-turut masuk dan menyelesaikan aksi! Melewatkan 1 hari akan me-reset streak ke 0.`
                : 'Streak 0 Hari: Anda belum menyelesaikan aksi hari ini atau melewatkan hari kemarin. Selesaikan tantangan sekarang untuk memulai streak!'
            }
          >
            <Flame
              className={`w-5 h-5 transition-transform duration-200 ${
                hasActiveStreak
                  ? 'text-orange-500 fill-orange-500 animate-pulse drop-shadow-[0_2px_4px_rgba(249,115,22,0.35)] scale-110'
                  : 'text-amber-400 stroke-[1.8]'
              }`}
            />
            <div className="text-right leading-none">
              <span
                className={`text-xs font-extrabold ${
                  hasActiveStreak ? 'text-amber-950' : 'text-amber-900'
                }`}
              >
                {isGuest ? '—' : `${user.streakDays} Hari`}
              </span>
              <span
                className={`block text-[9px] font-semibold mt-0.5 ${
                  hasActiveStreak ? 'text-orange-700' : 'text-amber-600'
                }`}
              >
                {isGuest ? 'Streak' : hasActiveStreak ? 'Streak Aktif' : 'Mulai Aksi'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Scripture Banner */}
      {todayDevotion && (
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2E6B34] to-[#1E4A23] p-4 text-white shadow-lg shadow-[#2E6B34]/20 sm:p-6">
            {/* Background Sprout pattern */}
            <div className="absolute -right-4 -bottom-6 w-28 h-28 opacity-10 pointer-events-none">
              <Trees className="w-full h-full text-white" />
            </div>

            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#A8D5A2] bg-white/10 px-2.5 py-0.5 rounded-full">
                <BookOpen className="w-3 h-3" />
                Renungan Ciptaan Hari Ini
              </span>
              <span className="text-[11px] text-[#A8D5A2]/80">1 mnt baca</span>
            </div>

            <h3 className="text-sm font-bold font-poppins leading-snug">
              "{todayDevotion.title}"
            </h3>
            <p className="text-xs text-[#FAF6EC]/90 italic mt-1.5 line-clamp-2">
              "{todayDevotion.verseText}"
            </p>
            <p className="text-[11px] text-[#A8D5A2] font-semibold mt-1">
              {todayDevotion.scripture}
            </p>

            <div className="mt-3 pt-2.5 border-t border-white/15 flex items-center justify-between">
              <span className="text-[11px] text-[#FAF6EC]/80 italic truncate max-w-[190px]">
                {todayDevotion.batakWisdom.split(':')[0]}
              </span>
              <button
                onClick={() => onNavigateTab('devotions')}
                className="touch-target inline-flex items-center gap-1 text-xs font-bold bg-[#A8D5A2] text-[#1F2A1F] px-3 py-1.5 rounded-xl hover:bg-white transition active:scale-95 shadow-sm"
              >
                <span>Baca &amp; Ambil Aksi</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Action Matrix */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => onNavigateTab('challenges')}
            className="p-2.5 rounded-2xl bg-white border border-[#2E6B34]/15 shadow-xs hover:border-[#2E6B34] flex flex-col items-center text-center transition group active:scale-95"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-1 group-hover:scale-105 transition">
              <Flame className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-gray-800 leading-tight">
              Tantangan
            </span>
          </button>

          <button
            onClick={() => onNavigateTab('waste-scan')}
            className="p-2.5 rounded-2xl bg-white border border-[#2E6B34]/15 shadow-xs hover:border-[#2E6B34] flex flex-col items-center text-center transition group active:scale-95"
          >
            <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center mb-1 group-hover:scale-105 transition">
              <Camera className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-gray-800 leading-tight">
              Pindai AI
            </span>
          </button>

          <button
            onClick={() => onNavigateTab('reports')}
            className="p-2.5 rounded-2xl bg-white border border-[#2E6B34]/15 shadow-xs hover:border-[#2E6B34] flex flex-col items-center text-center transition group active:scale-95"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-1 group-hover:scale-105 transition">
              <MapPin className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-gray-800 leading-tight">
              Lapor Alam
            </span>
          </button>

          <button
            onClick={() => onNavigateTab('liturgy')}
            className="p-2.5 rounded-2xl bg-white border border-[#2E6B34]/15 shadow-xs hover:border-[#2E6B34] flex flex-col items-center text-center transition group active:scale-95"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-1 group-hover:scale-105 transition">
              <ScrollText className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-gray-800 leading-tight">
              Doa &amp; Liturgi
            </span>
          </button>
        </div>
      </div>

      {/* Virtual Garden & Community Forest Snapshot */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white border border-[#2E6B34]/20 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#A8D5A2]/30 text-[#2E6B34] flex items-center justify-center">
                <Trees className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold font-poppins text-[#1F2A1F]">
                  Taman Anda: {garden.stage} (Lv. {garden.level})
                </h4>
                <p className="text-[10px] text-gray-500">
                  {garden.currentExp} / {garden.neededExp} EXP Menuju Tingkat Berikutnya
                </p>
              </div>
            </div>

            <button
              onClick={handleWater}
              className="touch-target inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-700 hover:bg-cyan-100 transition active:scale-95"
              title="Siram tanaman virtual dengan air Silindung"
            >
              <Droplet className="w-3.5 h-3.5 fill-cyan-500 text-cyan-600" />
              <span>{user.id === 'guest-preview' ? 'Masuk untuk menyiram' : 'Siram (+10)'}</span>
            </button>
          </div>

          {/* Garden Progress bar */}
          <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#2E6B34] to-[#A8D5A2] h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.round((garden.currentExp / garden.neededExp) * 100))}%`,
              }}
            />
          </div>

          {waterToast && (
            <div className="text-center py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-xl animate-in fade-in">
              🌿 {waterToast}
            </div>
          )}

          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-600 text-[11px]">
              🌲 Hutan Komunitas: <strong>—</strong> pohon tercatat
            </span>
            <button
              onClick={() => onNavigateTab('garden')}
              className="text-[#2E6B34] font-bold flex items-center gap-0.5 hover:underline text-[11px]"
            >
              <span>Lihat Kebun</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Featured Challenges */}
      <div className="space-y-2 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#7A5230] font-poppins">
            Tantangan Aksi Hari Ini
          </h3>
          <button
            onClick={() => onNavigateTab('challenges')}
            className="text-xs font-bold text-[#2E6B34] hover:underline"
          >
            Lihat Semua ({challenges.length})
          </button>
        </div>

        <div className="space-y-2">
          {featuredChallenges.map((chal) => (
            <div
              key={chal.id}
              className="p-3.5 rounded-2xl bg-white border border-gray-200/90 hover:border-[#2E6B34]/50 shadow-xs flex items-center justify-between gap-3 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#A8D5A2]/25 text-[#2E6B34] flex items-center justify-center font-bold text-lg shrink-0">
                  {chal.id.includes('tumbler')
                    ? '🥤'
                    : chal.id.includes('pohon')
                    ? '🌱'
                    : chal.id.includes('sampah')
                    ? '♻️'
                    : '🌿'}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#1F2A1F] leading-tight">
                    {chal.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-semibold text-[#2E6B34] bg-[#A8D5A2]/30 px-2 py-0.5 rounded-md">
                      +{chal.points} Poin
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {chal.difficulty}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onOpenVerifyModal(chal)}
                className="touch-target px-3 py-1.5 rounded-xl bg-[#2E6B34] text-white text-xs font-bold hover:bg-[#235328] transition active:scale-95 shrink-0 shadow-xs"
              >
                Bukti Foto
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Impact Snapshot */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-[#FAF6EC] border border-[#2E6B34]/25 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold font-poppins text-[#2E6B34] uppercase tracking-wide">
              Capaian Dampak Pribadi
            </span>
            <button
              onClick={() => onNavigateTab('impact')}
              className="text-[11px] text-[#7A5230] font-bold hover:underline"
            >
              Rincian Grafik
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center pt-1">
            <div className="bg-white p-2 rounded-xl border border-gray-200">
              <Trash2 className="w-4 h-4 mx-auto text-emerald-600 mb-1" />
              <span className="text-xs font-extrabold text-[#1F2A1F] block">
                {userImpact.wasteKg} kg
              </span>
              <span className="text-[9px] text-gray-500 font-medium">Sampah</span>
            </div>
            <div className="bg-white p-2 rounded-xl border border-gray-200">
              <Trees className="w-4 h-4 mx-auto text-green-700 mb-1" />
              <span className="text-xs font-extrabold text-[#1F2A1F] block">
                {userImpact.trees}
              </span>
              <span className="text-[9px] text-gray-500 font-medium">Pohon</span>
            </div>
            <div className="bg-white p-2 rounded-xl border border-gray-200">
              <Droplet className="w-4 h-4 mx-auto text-cyan-600 mb-1" />
              <span className="text-xs font-extrabold text-[#1F2A1F] block">
                {userImpact.waterLiters} L
              </span>
              <span className="text-[9px] text-gray-500 font-medium">Air Hemat</span>
            </div>
            <div className="bg-white p-2 rounded-xl border border-gray-200">
              <Zap className="w-4 h-4 mx-auto text-amber-500 mb-1" />
              <span className="text-xs font-extrabold text-[#1F2A1F] block">
                {userImpact.electricityKwh}
              </span>
              <span className="text-[9px] text-gray-500 font-medium">kWh Listrik</span>
            </div>
          </div>
        </div>
      </div>

      {/* Papan Peringkat Komunitas Teaser */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div
          onClick={() => onNavigateTab('community')}
          className="cursor-pointer rounded-3xl bg-gradient-to-r from-emerald-800 to-[#2E6B34] p-4 text-white shadow-md hover:shadow-lg transition relative overflow-hidden group"
        >
          <div className="absolute right-0 bottom-0 opacity-15 pointer-events-none translate-x-2 translate-y-2 group-hover:scale-110 transition-transform">
            <Trophy className="w-28 h-28 text-amber-300" />
          </div>

          <div className="relative z-10 flex items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 text-[10px] font-black uppercase tracking-wider">
                  🏆 Papan Peringkat
                </span>
                <span className="text-[11px] text-emerald-100 font-medium">
                  Gotong Royong Hijau
                </span>
              </div>
              <h4 className="text-sm font-bold font-poppins text-white leading-tight">
                Peringkat Jemaat &amp; Mahasiswa
              </h4>
              <p className="text-[11px] text-emerald-100/90 leading-tight">
                Lihat perolehan Poin Hijau dan saling dorong dalam aksi merawat Danau Toba.
              </p>
            </div>

            <div className="shrink-0 flex flex-col items-center justify-center pl-2">
              <div className="w-9 h-9 rounded-2xl bg-white/20 group-hover:bg-white text-white group-hover:text-[#2E6B34] flex items-center justify-center transition shadow-xs">
                <ChevronRight className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-bold text-amber-300 mt-1 uppercase">
                Buka
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Community Activity Feed (Marsiadapari Nyata) */}
      <div className="space-y-2 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#7A5230] font-poppins">
            Kabar Gotong Royong Terkini
          </h3>
          <button
            onClick={() => onNavigateTab('community')}
            className="text-xs font-bold text-[#2E6B34] hover:underline"
          >
            Papan Capaian
          </button>
        </div>

        <div className="space-y-2">
          {submissions.map((sub) => (
            <div
              key={sub.id}
              className="p-3 rounded-2xl bg-white border border-gray-200/90 shadow-xs flex items-start gap-3"
            >
              <img
                src={sub.imageThumbnail}
                alt={sub.challengeTitle}
                className="w-12 h-12 rounded-xl object-cover shrink-0 border border-gray-200"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-gray-900 truncate">
                    {sub.isAnonymous ? 'Sahabat Ciptaan (Anonim)' : sub.userName}
                  </span>
                  <span className="text-[10px] text-[#2E6B34] font-semibold bg-emerald-50 px-1.5 py-0.5 rounded-md shrink-0">
                    +{sub.awardedPoints} Poin
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-[#7A5230] truncate mt-0.5">
                  {sub.challengeTitle}
                </p>
                <p className="text-[10px] text-gray-500 line-clamp-1 mt-0.5">
                  "{sub.userNotes || sub.yang_terlihat}"
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Cultural Quote */}
      <div className="px-6 text-center pt-2">
        <BatakGorgaBorder className="opacity-40" />
        <p className="text-[11px] text-[#7A5230] italic font-medium mt-1">
          "Si pogos so marripu, si mamora so marhaha maranggi"
        </p>
        <p className="text-[10px] text-gray-600 mt-0.5">
          Bergotong royong tanpa pamrih merawat Danau Toba dan Bona Pasogit
        </p>
      </div>
    </div>
  );
};
