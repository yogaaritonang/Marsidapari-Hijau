import React, { useState } from 'react';
import {
  Users,
  Trophy,
  CheckCircle2,
  XCircle,
  EyeOff,
  Flame,
  Swords,
  ChevronRight,
  ShieldCheck,
  Trees,
  Images,
} from 'lucide-react';
import { User, ChallengeSubmission, Community } from '../types';
import { StorageService } from '../services/storageService';
import { CommunityLeaderboard } from '../components/CommunityLeaderboard';
import { CommunityGallery } from '../components/CommunityGallery';

interface CommunityPageProps {
  user: User;
  isGuest: boolean;
  onRequireAuth: () => void;
  onOpenVerifyModal?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const CommunityPage: React.FC<CommunityPageProps> = ({ user, isGuest, onRequireAuth, onNavigateTab }) => {
  const [activeTab, setActiveTab] = useState<'peringkat' | 'galeri' | 'konfirmasi' | 'antar_kelompok'>('peringkat');
  const [communities] = useState<Community[]>(StorageService.getCommunities());
  const [submissions, setSubmissions] = useState<ChallengeSubmission[]>(
    StorageService.getSubmissions()
  );
  const [reviewToast, setReviewToast] = useState<string | null>(null);

  const userCommunity =
    communities.find((c) => c.id === user.communityId) || {
      id: 'umum',
      name: 'Komunitas Marsiadapari Hijau',
      category: 'Komunitas Warga' as const,
      location: 'Tapanuli Utara',
      memberCount: 0,
      totalPoints: 0,
      treesPlanted: 0,
      treeTarget: 0,
      actionCount: 0,
      actionTarget: 0,
      description: '',
    };

  // Submissions needing review
  const pendingReviews = submissions.filter((s) => s.verdict === 'perlu_tinjauan');

  const handleReview = (id: string, verdict: 'valid' | 'tidak_valid') => {
    if (isGuest) {
      onRequireAuth();
      return;
    }
    StorageService.updateSubmissionReview(id, verdict, user.name);
    setSubmissions(StorageService.getSubmissions());
    setReviewToast(
      verdict === 'valid'
        ? 'Bukti telah dikonfirmasi sah! Poin berhasil diberikan kepada jemaat.'
        : 'Bukti telah ditolak secara santun.'
    );
    setTimeout(() => setReviewToast(null), 3000);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-28 pt-3 px-4 sm:px-6">
      {/* Header */}
      <div>
        <span className="text-xs font-bold text-[#7A5230] uppercase tracking-wider">
          Marsiadapari Se-Tapanuli Utara
        </span>
        <h2 className="text-lg font-bold font-poppins text-[#1F2A1F]">
          Komunitas &amp; Gotong Royong
        </h2>
        <p className="text-xs text-gray-600 mt-0.5">
          Persekutuan jemaat, mahasiswa, dan pemuda merawat Danau Toba bersama
        </p>
      </div>

      {/* Group Target Progress Bar Card */}
      <div className="rounded-3xl bg-white border border-[#2E6B34]/25 p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#2E6B34] text-white flex items-center justify-center font-bold">
              <Users className="w-5 h-5 text-[#A8D5A2]" />
            </div>
            <div>
              <h3 className="text-xs font-bold font-poppins text-[#1F2A1F]">
                Target Bersama: {userCommunity.name.split('(')[0]}
              </h3>
              <p className="text-[10px] text-gray-500">
                {userCommunity.actionTarget > 0
                  ? `Bulan Ini: ${userCommunity.actionCount} / ${userCommunity.actionTarget} Aksi Tercapai`
                  : 'Data aksi komunitas belum tersedia'}
              </p>
            </div>
          </div>
          <span className="text-xs font-extrabold text-[#2E6B34]">
            {userCommunity.actionTarget > 0
              ? `${Math.round((userCommunity.actionCount / userCommunity.actionTarget) * 100)}%`
              : '—'}
          </span>
        </div>

        <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden border border-gray-200">
          <div
            className="bg-gradient-to-r from-[#2E6B34] via-[#4CAF50] to-[#3B8EA5] h-full rounded-full transition-all duration-700"
            style={{
              width: userCommunity.actionTarget > 0
                ? `${Math.min(100, Math.round((userCommunity.actionCount / userCommunity.actionTarget) * 100))}%`
                : '0%',
            }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-1 rounded-2xl border border-gray-200 bg-white p-1 shadow-2xs sm:grid-cols-4">
        <button
          onClick={() => setActiveTab('peringkat')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === 'peringkat'
              ? 'bg-[#2E6B34] text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          🏆 Papan Capaian
        </button>
        <button
          onClick={() => setActiveTab('galeri')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === 'galeri'
              ? 'bg-[#2E6B34] text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <Images className="h-3.5 w-3.5" />
            Galeri Komunitas
          </span>
        </button>
        <button
          onClick={() => setActiveTab('konfirmasi')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition relative ${
            activeTab === 'konfirmasi'
              ? 'bg-[#2E6B34] text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <span>🤝 Saling Konfirmasi</span>
          {pendingReviews.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-extrabold">
              {pendingReviews.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('antar_kelompok')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === 'antar_kelompok'
              ? 'bg-[#2E6B34] text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          ⚔️ Antar-Gereja
        </button>
      </div>

      {reviewToast && (
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-300 text-xs font-semibold animate-in fade-in text-center">
          {reviewToast}
        </div>
      )}

      {/* Tab Content 1: Papan Capaian */}
      {activeTab === 'peringkat' && (
        <CommunityLeaderboard user={user} onNavigateTab={onNavigateTab} />
      )}

      {activeTab === 'galeri' && (
        <CommunityGallery user={user} isGuest={isGuest} onRequireAuth={onRequireAuth} />
      )}

      {/* Tab Content 2: Saling Konfirmasi Bukti (Peer Review) */}
      {activeTab === 'konfirmasi' && (
        <div className="space-y-3">
          <div className="p-3 bg-white rounded-2xl border border-gray-200 text-xs text-gray-600 space-y-1">
            <span className="font-bold text-gray-900 block">
              Prinsip Marsiadapari Saling Menjaga:
            </span>
            <p>
              Bukti foto yang tergolong <em>"perlu tinjauan"</em> diverifikasi bersama oleh rekan jemaat atau pimpinan kelompok agar kejujuran dan rasa gotong royong senantiasa terpelihara.
            </p>
          </div>

          {pendingReviews.length === 0 ? (
            <div className="p-8 bg-white rounded-3xl border border-gray-200 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-[#2E6B34] mx-auto opacity-70" />
              <h4 className="text-sm font-bold text-gray-800 font-poppins">
                Semua Bukti Telah Terverifikasi!
              </h4>
              <p className="text-xs text-gray-500">
                Tidak ada antrean tinjauan aksi saat ini.                 Bukti yang membutuhkan tinjauan akan muncul di sini.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingReviews.map((sub) => (
                <div
                  key={sub.id}
                  className="p-4 rounded-3xl bg-white border border-amber-200 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-amber-700 uppercase bg-amber-100 px-2 py-0.5 rounded-md">
                        Perlu Tinjauan Bersama
                      </span>
                      <h4 className="text-xs font-bold text-gray-900 mt-1">
                        {sub.challengeTitle}
                      </h4>
                      <p className="text-[11px] text-gray-500">
                        Oleh: {sub.isAnonymous ? 'Sahabat Ciptaan' : sub.userName} &bull; Keyakinan Sistem: {sub.confidence}%
                      </p>
                    </div>
                    <span className="text-xs font-bold text-[#2E6B34]">
                      +{sub.awardedPoints} Poin
                    </span>
                  </div>

                  <div className="flex gap-3">
                    {sub.imageThumbnail && sub.imageThumbnail.trim() ? (
                      <img
                        src={sub.imageThumbnail}
                        alt="Bukti foto"
                        className="w-20 h-20 rounded-xl object-cover border border-gray-200 shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-emerald-100/80 border border-emerald-200/80 flex items-center justify-center text-[#2E6B34] shrink-0">
                        <Trees className="w-8 h-8" />
                      </div>
                    )}
                    <div className="text-xs text-gray-700 space-y-1">
                      <p className="italic bg-gray-50 p-2 rounded-xl border border-gray-100">
                        "{sub.userNotes || 'Tanpa catatan'}"
                      </p>
                      <p className="text-[11px] text-gray-500">
                        Alasan Analisis: {sub.alasan}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1 border-t border-gray-100">
                    <button
                      onClick={() => handleReview(sub.id, 'tidak_valid')}
                      disabled={isGuest}
                      className="flex-1 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition flex items-center justify-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Belum Sesuai</span>
                    </button>
                    <button
                      onClick={() => handleReview(sub.id, 'valid')}
                      disabled={isGuest}
                      className="flex-1 py-2 rounded-xl bg-[#2E6B34] text-white text-xs font-bold hover:bg-[#235328] transition flex items-center justify-center gap-1 shadow-sm"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Konfirmasi Sah</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {isGuest && pendingReviews.length > 0 && (
            <button
              onClick={onRequireAuth}
              className="w-full rounded-xl bg-[#2E6B34] px-4 py-3 text-xs font-bold text-white hover:bg-[#235328]"
            >
              Masuk untuk mengonfirmasi bukti
            </button>
          )}
        </div>
      )}

      {/* Tab Content 3: Antar-Gereja / Fakultas */}
      {activeTab === 'antar_kelompok' && (
        <div className="space-y-3">
          <div className="p-3 bg-gradient-to-r from-[#2E6B34] to-[#1B4320] text-white rounded-3xl shadow-sm space-y-1">
            <div className="flex items-center gap-2">
              <Swords className="w-4 h-4 text-amber-300" />
              <h4 className="text-xs font-bold font-poppins">
                Liga Gotong Royong Ciptaan Periode Oktober - November 2026
              </h4>
            </div>
            <p className="text-[11px] text-[#A8D5A2]">
              Persaingan sehat antarkampus dan persekutuan gereja dalam aksi pelestarian Danau Toba
            </p>
          </div>

          <div className="space-y-2">
            {communities.map((comm, idx) => (
              <div
                key={comm.id}
                className="p-3.5 bg-white rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#A8D5A2]/30 text-[#2E6B34] flex items-center justify-center font-extrabold text-xs">
                    #{idx + 1}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 leading-tight">
                      {comm.name}
                    </h4>
                    <span className="text-[10px] text-gray-500">
                      {comm.category} &bull; {comm.memberCount} Anggota
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-extrabold text-[#2E6B34] block">
                    {comm.totalPoints.toLocaleString()} Poin
                  </span>
                  <span className="text-[10px] text-green-700 font-semibold">
                    🌲 {comm.treesPlanted} Pohon
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
