import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Medal,
  Award,
  Crown,
  Flame,
  Trees,
  Droplet,
  Trash2,
  Zap,
  Search,
  Filter,
  EyeOff,
  Heart,
  ChevronRight,
  Sparkles,
  Info,
  X,
  Share2,
  CheckCircle2,
} from 'lucide-react';
import { User, Community } from '../types';
import { StorageService } from '../services/storageService';
import { BatakGorgaBorder } from './BatakPattern';

export interface LeaderboardMember {
  id: string;
  name: string;
  isAnonymous: boolean;
  community: string;
  category: 'Mahasiswa' | 'Jemaat Gereja' | 'Pemuda';
  points: number;
  monthlyPoints: number;
  weeklyPoints: number;
  completedCount: number;
  trees: number;
  wasteKg: number;
  waterSavedLiters: number;
  streakDays: number;
  badges: string[];
  avatarColor: string;
  cheers: number;
}

interface CommunityLeaderboardProps {
  user: User;
  onNavigateTab?: (tab: string) => void;
  onOpenChallenge?: (challengeId: string) => void;
}

export const CommunityLeaderboard: React.FC<CommunityLeaderboardProps> = ({
  user,
  onNavigateTab,
}) => {
  const [period, setPeriod] = useState<'monthly' | 'weekly' | 'allTime'>('monthly');
  const [communityFilter, setCommunityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<LeaderboardMember | null>(null);
  const [cheersState, setCheersState] = useState<{ [id: string]: number }>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);


  const members = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const startOfWeek = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const participants = new Map<string, {
      userId: string;
      name: string;
      isAnonymous: boolean;
      community: string;
      points: number;
      monthlyPoints: number;
      weeklyPoints: number;
      completedCount: number;
      trees: number;
      wasteKg: number;
      waterSavedLiters: number;
    }>();

    for (const submission of StorageService.getSubmissions()) {
      if (submission.verdict !== 'valid') continue;
      const submittedAt = new Date(submission.submittedAt).getTime();
      const participant = participants.get(submission.userId) ?? {
        userId: submission.userId,
        name: submission.userName,
        isAnonymous: submission.isAnonymous,
        community: submission.userId === user.id
          ? user.communityName.split('(')[0].trim()
          : 'Komunitas Marsiadapari Hijau',
        points: 0,
        monthlyPoints: 0,
        weeklyPoints: 0,
        completedCount: 0,
        trees: 0,
        wasteKg: 0,
        waterSavedLiters: 0,
      };
      participant.isAnonymous = submission.isAnonymous;
      participant.points += submission.awardedPoints;
      participant.completedCount += 1;
      participant.trees += submission.impact.trees;
      participant.wasteKg += submission.impact.wasteKg;
      participant.waterSavedLiters += submission.impact.waterLiters;
      if (submittedAt >= startOfMonth) participant.monthlyPoints += submission.awardedPoints;
      if (submittedAt >= startOfWeek) participant.weeklyPoints += submission.awardedPoints;
      participants.set(submission.userId, participant);
    }

    return [...participants.values()]
      .map((participant) => ({
        ...participant,
        id: participant.userId,
        category: participant.community.toLowerCase().includes('kampus') ? 'Mahasiswa' as const : 'Jemaat Gereja' as const,
        streakDays: participant.userId === user.id ? user.streakDays : 0,
        badges: [],
        avatarColor: 'from-[#2E6B34] to-[#1E4A23]',
        cheers: 0,
      }))
      .sort((a, b) => {
        const pointsA = period === 'monthly' ? a.monthlyPoints : period === 'weekly' ? a.weeklyPoints : a.points;
        const pointsB = period === 'monthly' ? b.monthlyPoints : period === 'weekly' ? b.weeklyPoints : b.points;
        return pointsB - pointsA;
      });
  }, [user, period]);

  // Filtered list
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      // Community filter
      if (communityFilter !== 'all' && !m.community.toLowerCase().includes(communityFilter.toLowerCase())) {
        return false;
      }
      // Category filter
      if (categoryFilter !== 'all' && m.category !== categoryFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = m.isAnonymous ? query.includes('anonim') : m.name.toLowerCase().includes(query);
        const matchesCommunity = m.community.toLowerCase().includes(query);
        if (!matchesName && !matchesCommunity) return false;
      }
      return true;
    });
  }, [members, communityFilter, categoryFilter, searchQuery]);

  // Current user's rank in filtered list
  const isGuest = user.id === 'guest-preview';
  const currentUserMember = filteredMembers.find((member) => member.id === user.id);
  const currentUserRankIndex = filteredMembers.findIndex((m) => m.id === user.id);
  const currentUserRank = currentUserRankIndex !== -1 ? currentUserRankIndex + 1 : null;
  const userAbove = currentUserRankIndex > 0 ? filteredMembers[currentUserRankIndex - 1] : null;

  const getUserPoints = (member: LeaderboardMember) => {
    if (period === 'monthly') return member.monthlyPoints;
    if (period === 'weekly') return member.weeklyPoints;
    return member.points;
  };

  const handleCheer = (member: LeaderboardMember, e: React.MouseEvent) => {
    e.stopPropagation();
    const current = cheersState[member.id] || member.cheers;
    setCheersState((prev) => ({ ...prev, [member.id]: current + 1 }));

    const cheerPhrases = [
      `Horas! Semangat gotong royong dikirimkan ke ${member.isAnonymous ? 'Sahabat Ciptaan' : member.name}! 🎉`,
      `Puji Tuhan! Dukungan cinta kasih terkirim untuk aksi hijau ${member.isAnonymous ? 'Sahabat Ciptaan' : member.name}! 🌿`,
      `Marsiadapari! Saling mendorong dalam pekerjaan baik! 🤝`,
    ];
    const picked = cheerPhrases[Math.floor(Math.random() * cheerPhrases.length)];
    setToastMessage(picked);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Top 3 Podium
  const top1 = filteredMembers[0];
  const top2 = filteredMembers[1];
  const top3 = filteredMembers[2];
  const restList = filteredMembers.slice(3);

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-18 left-4 right-4 z-50 p-3 bg-gradient-to-r from-[#2E6B34] to-[#1E4A23] text-white rounded-2xl shadow-xl flex items-center justify-between gap-2 border border-emerald-400 text-xs font-semibold animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-300 shrink-0 animate-spin" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 hover:bg-white/20 rounded-full"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Banner & Scripture Inspiration */}
      <div className="rounded-3xl bg-gradient-to-br from-[#2E6B34] via-[#245429] to-[#1B3E1F] p-4 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-4 translate-y-4">
          <Trophy className="w-40 h-40 text-amber-300" />
        </div>

        <div className="relative z-10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 text-[11px] font-bold tracking-wide uppercase text-emerald-200 backdrop-blur-xs">
              <Trophy className="w-3.5 h-3.5 text-amber-300" />
              Papan Peringkat Marsiadapari
            </span>
            <span className="text-[11px] text-emerald-100 font-medium">
              {filteredMembers.length} Jemaat &amp; Mahasiswa
            </span>
          </div>

          <div>
            <h3 className="text-lg font-bold font-poppins text-white leading-tight">
              Perlombaan Kebaikan Merawat Danau Toba
            </h3>
            <p className="text-xs text-emerald-100/90 mt-1 leading-relaxed">
              Setiap sampah dipungut, pohon ditanam, dan air dihemat menjadi persembahan syukur yang hidup bagi Tuhan.
            </p>
          </div>

          <div className="pt-1.5 border-t border-white/15 flex items-center gap-2 text-[10px] text-emerald-200 italic">
            <span>📖</span>
            <p>
              "Dan marilah kita saling memperhatikan supaya kita saling mendorong dalam kasih dan dalam pekerjaan baik." — <strong>Ibrani 10:24</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Pinned Current User Card (Posisi Anda) */}
      {!isGuest && currentUserMember && <div className="rounded-3xl bg-gradient-to-r from-amber-50 to-emerald-50 border-2 border-[#2E6B34]/30 p-4 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-[#2E6B34] text-white flex items-center justify-center font-bold text-sm shadow-xs">
              {currentUserRank ? `#${currentUserRank}` : '—'}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold text-gray-900 font-poppins">
                  Posisi Anda ({user.name})
                </h4>
                {user.preferences.isAnonymous && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-extrabold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                    <EyeOff className="w-2.5 h-2.5" />
                    Tampil Anonim
                  </span>
                )}
              </div>
              <p className="text-[10px] text-gray-600">
                {user.communityName.split('(')[0]} &bull; {user.streakDays} Hari Streak 🔥
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-base font-extrabold text-[#2E6B34] block leading-none">
              {getUserPoints(currentUserMember)}
            </span>
            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">
              Poin Hijau
            </span>
          </div>
        </div>

        {/* Motivational Progress to Next Rank */}
        {userAbove ? (
          <div className="p-2.5 rounded-2xl bg-white/90 border border-[#2E6B34]/20 flex items-center justify-between text-xs text-gray-700">
            <div className="flex items-center gap-1.5 text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>
                Hanya butuh{' '}
                <strong className="text-[#2E6B34]">
                  {getUserPoints(userAbove) - getUserPoints(currentUserMember) + 5}{' '}
                  poin
                </strong>{' '}
                lagi untuk naik ke peringkat #{currentUserRankIndex}!
              </span>
            </div>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('challenges')}
                className="text-[10px] font-bold text-[#2E6B34] hover:underline flex items-center gap-0.5 shrink-0"
              >
                Ambil Aksi <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        ) : (
          <div className="p-2 rounded-2xl bg-amber-100/70 border border-amber-300 text-center text-xs font-bold text-amber-900">
            👑 Puji Tuhan! Anda berada di puncak peringkat kebaikan saat ini!
          </div>
        )}
      </div>}

      {/* Period Tabs */}
      <div className="flex p-1 bg-white rounded-2xl border border-gray-200 shadow-2xs">
        <button
          onClick={() => setPeriod('monthly')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
            period === 'monthly'
              ? 'bg-[#2E6B34] text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          🗓️ Bulan Ini
        </button>
        <button
          onClick={() => setPeriod('weekly')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
            period === 'weekly'
              ? 'bg-[#2E6B34] text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          ⚡ Minggu Ini
        </button>
        <button
          onClick={() => setPeriod('allTime')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
            period === 'allTime'
              ? 'bg-[#2E6B34] text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          🌟 Sepanjang Waktu
        </button>
      </div>

      {/* Filters & Search Bar */}
      <div className="space-y-2 bg-white p-3 rounded-2xl border border-gray-200 shadow-2xs">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama anggota atau gereja/kampus..."
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2E6B34] focus:bg-white transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
            >
              &times;
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className="text-[10px] font-bold uppercase text-gray-500 shrink-0">
            Lingkup:
          </span>
          <button
            onClick={() => setCommunityFilter('all')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              communityFilter === 'all'
                ? 'bg-[#7A5230] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Semua Komunitas
          </button>
        </div>
      </div>

      {/* Podium Top 3 Visual (Juara Marsiadapari) */}
      {top1 && (
        <div className="rounded-3xl bg-white border border-[#2E6B34]/25 p-4 shadow-sm space-y-3">
          <div className="text-center">
            <span className="text-[10px] font-bold text-[#7A5230] uppercase tracking-wider">
              Podium Kebaikan Ciptaan
            </span>
            <h4 className="text-xs font-bold font-poppins text-[#1F2A1F]">
              Tiga Besar Pejuang Lestari Silindung &amp; Danau Toba
            </h4>
          </div>

          <div className="flex items-end justify-center gap-2 pt-4 pb-2">
            {/* Rank 2 (Silver) */}
            {top2 ? (
              <div
                onClick={() => setSelectedMember(top2)}
                className="cursor-pointer flex-1 flex flex-col items-center text-center transition hover:scale-102"
              >
                <div className="relative mb-1">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-slate-400 to-slate-200 border-2 border-slate-300 shadow-md flex items-center justify-center font-bold text-slate-800 text-xs">
                    {top2.name
                      .split(' ')
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join('')}
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-300 border border-white text-slate-900 text-[10px] font-black flex items-center justify-center shadow-xs">
                    2
                  </span>
                </div>
                <span className="text-[11px] font-bold text-gray-900 line-clamp-1 max-w-[90px]">
                  {top2.isAnonymous && top2.id !== user.id
                    ? 'Sahabat Ciptaan'
                    : top2.name}
                </span>
                <span className="text-[9px] text-gray-500 line-clamp-1 max-w-[90px]">
                  {top2.community}
                </span>
                <div className="w-full mt-2 pt-2 pb-3 bg-gradient-to-b from-slate-200 to-slate-100 rounded-t-2xl border-t-2 border-slate-300 flex flex-col items-center justify-center">
                  <Medal className="w-4 h-4 text-slate-500 mb-0.5" />
                  <span className="text-xs font-black text-slate-800">
                    {getUserPoints(top2)}
                  </span>
                  <span className="text-[8px] text-slate-600 font-semibold uppercase">
                    Poin
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex-1" />
            )}

            {/* Rank 1 (Gold) */}
            {top1 && (
              <div
                onClick={() => setSelectedMember(top1)}
                className="cursor-pointer flex-1 flex flex-col items-center text-center transition hover:scale-102 -mt-4"
              >
                <div className="relative mb-1">
                  <Crown className="w-5 h-5 text-amber-500 mx-auto -mb-1 animate-bounce" />
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 border-3 border-amber-300 shadow-lg flex items-center justify-center font-black text-amber-950 text-sm">
                    {top1.name
                      .split(' ')
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join('')}
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-400 border-2 border-white text-amber-950 text-xs font-black flex items-center justify-center shadow-xs">
                    1
                  </span>
                </div>
                <span className="text-xs font-extrabold text-[#1F2A1F] line-clamp-1 max-w-[105px]">
                  {top1.isAnonymous && top1.id !== user.id
                    ? 'Sahabat Ciptaan'
                    : top1.name}
                </span>
                <span className="text-[10px] text-gray-600 font-semibold line-clamp-1 max-w-[105px]">
                  {top1.community}
                </span>
                <div className="w-full mt-2 pt-3 pb-4 bg-gradient-to-b from-amber-200 via-amber-100 to-yellow-50 rounded-t-2xl border-t-2 border-amber-400 flex flex-col items-center justify-center shadow-xs">
                  <Trophy className="w-5 h-5 text-amber-600 mb-0.5" />
                  <span className="text-sm font-black text-amber-900">
                    {getUserPoints(top1)}
                  </span>
                  <span className="text-[9px] text-amber-700 font-bold uppercase">
                    Poin Hijau
                  </span>
                </div>
              </div>
            )}

            {/* Rank 3 (Bronze) */}
            {top3 ? (
              <div
                onClick={() => setSelectedMember(top3)}
                className="cursor-pointer flex-1 flex flex-col items-center text-center transition hover:scale-102"
              >
                <div className="relative mb-1">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-700 to-amber-600 border-2 border-amber-500 shadow-md flex items-center justify-center font-bold text-white text-xs">
                    {top3.name
                      .split(' ')
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join('')}
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-700 border border-white text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                    3
                  </span>
                </div>
                <span className="text-[11px] font-bold text-gray-900 line-clamp-1 max-w-[90px]">
                  {top3.isAnonymous && top3.id !== user.id
                    ? 'Sahabat Ciptaan'
                    : top3.name}
                </span>
                <span className="text-[9px] text-gray-500 line-clamp-1 max-w-[90px]">
                  {top3.community}
                </span>
                <div className="w-full mt-2 pt-2 pb-2 bg-gradient-to-b from-amber-100 to-amber-50 rounded-t-2xl border-t-2 border-amber-600 flex flex-col items-center justify-center">
                  <Award className="w-4 h-4 text-amber-700 mb-0.5" />
                  <span className="text-xs font-black text-amber-900">
                    {getUserPoints(top3)}
                  </span>
                  <span className="text-[8px] text-amber-800 font-semibold uppercase">
                    Poin
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex-1" />
            )}
          </div>
        </div>
      )}

      {/* Leaderboard Table / Card List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-extrabold text-[#7A5230] uppercase tracking-wider font-poppins">
            Daftar Lengkap Peringkat
          </span>
          <span className="text-[11px] text-gray-500">
            Menampilkan {filteredMembers.length} anggota
          </span>
        </div>

        {filteredMembers.length === 0 ? (
          <div className="p-8 bg-white rounded-3xl border border-gray-200 text-center space-y-2">
            <Info className="w-8 h-8 text-gray-400 mx-auto" />
            <h4 className="text-xs font-bold text-gray-700">
              {isGuest ? 'Belum ada capaian anggota' : 'Belum ada capaian yang cocok'}
            </h4>
            <p className="text-[11px] text-gray-500">
              {isGuest
                ? 'Papan capaian akan terisi setelah anggota mendaftar dan menyelesaikan aksi yang terverifikasi.'
                : 'Coba sesuaikan pencarian, filter, atau selesaikan aksi yang terverifikasi.'}
            </p>
          </div>
        ) : (
          filteredMembers.map((member, idx) => {
            const isMe = member.id === user.id;
            const rank = idx + 1;
            const pts = getUserPoints(member);
            const cheerCount = cheersState[member.id] || member.cheers;

            return (
              <div
                key={member.id}
                onClick={() => setSelectedMember(member)}
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-2.5 transition cursor-pointer hover:shadow-xs active:scale-[0.99] ${
                  isMe
                    ? 'bg-emerald-50/90 border-[#2E6B34] ring-2 ring-[#2E6B34]/30 shadow-xs'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* Left: Rank & Avatar */}
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Rank Number / Badge */}
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-2xs ${
                      rank === 1
                        ? 'bg-amber-400 text-amber-950'
                        : rank === 2
                        ? 'bg-slate-300 text-slate-800'
                        : rank === 3
                        ? 'bg-amber-700 text-white'
                        : rank <= 10
                        ? 'bg-[#2E6B34]/10 text-[#2E6B34] font-bold'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {rank}
                  </div>

                  {/* Avatar Icon */}
                  <div
                    className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${member.avatarColor} text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs`}
                  >
                    {member.name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')}
                  </div>

                  {/* Info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-gray-900 truncate">
                        {member.isAnonymous && !isMe
                          ? 'Sahabat Ciptaan (Anonim)'
                          : member.name}
                      </span>
                      {isMe && (
                        <span className="text-[9px] font-extrabold text-[#2E6B34] bg-[#A8D5A2]/40 px-1.5 py-0.2 rounded-md">
                          Anda
                        </span>
                      )}
                      {member.isAnonymous && (
                        <span title="Profil Anonim">
                          <EyeOff className="w-3 h-3 text-gray-400" />
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mt-0.5 truncate">
                      <span>{member.community}</span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-0.5 text-emerald-700 font-semibold">
                        <Trees className="w-2.5 h-2.5" />
                        {member.trees} Pohon
                      </span>
                      <span>&bull;</span>
                      <span>{member.completedCount} Aksi</span>
                    </div>
                  </div>
                </div>

                {/* Right: Points & Cheer button */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <span className="text-sm font-extrabold text-[#2E6B34] block leading-tight">
                      {pts}
                    </span>
                    <span className="text-[8px] text-gray-500 font-bold uppercase">
                      Poin Hijau
                    </span>
                  </div>

                  {/* Cheer button */}
                  <button
                    onClick={(e) => handleCheer(member, e)}
                    className="p-2 rounded-xl bg-gray-50 border border-gray-200 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 transition flex items-center gap-1 text-[10px] font-bold text-gray-600 active:scale-95"
                    title="Kirim Semangat Gotong Royong"
                  >
                    <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20" />
                    <span>{cheerCount}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Theological & Gotong Royong Wisdom Footer */}
      <div className="rounded-3xl bg-[#FAF6EC] border border-[#2E6B34]/20 p-4 text-center space-y-2">
        <BatakGorgaBorder className="opacity-40 max-w-xs mx-auto" />
        <h5 className="text-xs font-bold text-[#1F2A1F] font-poppins">
          Prinsip Marsiadapari Kristen
        </h5>
        <p className="text-[11px] text-[#7A5230] italic font-medium leading-relaxed">
          "Tampakna do rantosna, rim ni tahi do gogona."
        </p>
        <p className="text-[10px] text-gray-600 max-w-sm mx-auto leading-normal">
          Peringkat ini hadir bukan untuk saling menyombongkan capaian, melainkan untuk saling menyalakan semangat gotong royong dan kepedulian ekologis di Rura Silindung dan Danau Toba.
        </p>
      </div>

      {/* Member Detail Modal */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl space-y-4 border border-gray-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${selectedMember.avatarColor} text-white flex items-center justify-center font-bold text-sm shadow-md`}
                >
                  {selectedMember.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900 font-poppins">
                    {selectedMember.isAnonymous && selectedMember.id !== user.id
                      ? 'Sahabat Ciptaan (Anonim)'
                      : selectedMember.name}
                  </h4>
                  <p className="text-xs text-gray-600">
                    {selectedMember.community} &bull; {selectedMember.category}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedMember(null)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Impact Grid */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-emerald-50/70 p-2.5 rounded-2xl border border-emerald-100">
                <Trophy className="w-4 h-4 text-[#2E6B34] mx-auto mb-1" />
                <span className="text-xs font-black text-[#2E6B34] block">
                  {selectedMember.points}
                </span>
                <span className="text-[9px] text-gray-500 font-semibold uppercase">
                  Poin Total
                </span>
              </div>
              <div className="bg-green-50/70 p-2.5 rounded-2xl border border-green-100">
                <Trees className="w-4 h-4 text-green-700 mx-auto mb-1" />
                <span className="text-xs font-black text-green-800 block">
                  {selectedMember.trees}
                </span>
                <span className="text-[9px] text-gray-500 font-semibold uppercase">
                  Pohon
                </span>
              </div>
              <div className="bg-cyan-50/70 p-2.5 rounded-2xl border border-cyan-100">
                <CheckCircle2 className="w-4 h-4 text-cyan-700 mx-auto mb-1" />
                <span className="text-xs font-black text-cyan-800 block">
                  {selectedMember.completedCount}
                </span>
                <span className="text-[9px] text-gray-500 font-semibold uppercase">
                  Aksi Hijau
                </span>
              </div>
            </div>

            {/* Badges / Penghargaan */}
            <div>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                Lencana Dedikasi Ciptaan
              </span>
              <div className="flex flex-wrap gap-1.5">
                {selectedMember.badges.map((b, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-xl bg-gray-100 text-gray-800 text-[11px] font-medium border border-gray-200"
                  >
                    {b}
                  </span>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={(e) => {
                  handleCheer(selectedMember, e);
                  setSelectedMember(null);
                }}
                className="flex-1 py-2.5 bg-[#2E6B34] hover:bg-[#235328] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Heart className="w-3.5 h-3.5 fill-white" />
                Kirim Semangat ({cheersState[selectedMember.id] || selectedMember.cheers})
              </button>
              <button
                onClick={() => setSelectedMember(null)}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
