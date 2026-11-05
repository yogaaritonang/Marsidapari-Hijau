import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  Trees,
  CheckCircle2,
  XCircle,
  FileDown,
  CalendarPlus,
  Printer,
  ChevronRight,
  TrendingUp,
  Building,
  Target,
  Edit3,
  Save,
  MapPin,
  Calendar,
  Award,
  RefreshCw,
} from 'lucide-react';
import { User, ChallengeSubmission, GreenEvent, Community } from '../types';
import { StorageService } from '../services/storageService';
import { MapLocationReviewPanel } from '../components/MapLocationReviewPanel';

interface LeaderDashboardProps {
  user: User;
  onOpenCreateEvent?: () => void;
}

type LeaderTab = 'overview' | 'reviews' | 'community' | 'events' | 'locations';

export const LeaderDashboardPage: React.FC<LeaderDashboardProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<LeaderTab>('overview');
  const [submissions, setSubmissions] = useState<ChallengeSubmission[]>(() => StorageService.getSubmissions());
  const [communities, setCommunities] = useState<Community[]>(() => StorageService.getCommunities());
  const [events, setEvents] = useState<GreenEvent[]>(() => StorageService.getEvents());

  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [printReportModal, setPrintReportModal] = useState(false);
  const [communitySaveSuccess, setCommunitySaveSuccess] = useState(false);

  // Community profile editing
  const currentComm = communities.find((c) => c.id === user.communityId) || communities[0] || {
    id: user.communityId || 'umum',
    name: user.communityName || 'Komunitas Marsiadapari Hijau',
    category: 'Gereja' as Community['category'],
    location: 'Tarutung, Danau Toba',
    memberCount: 1,
    totalPoints: 0,
    actionCount: 0,
    treesPlanted: 0,
    treeTarget: 150,
    targetTrees: 150,
    actionTarget: 300,
    targetActions: 300,
    description: 'Komunitas gotong royong hijau merawat alam Danau Toba dan sekitarnya.',
  };

  const [commName, setCommName] = useState(currentComm.name);
  const [commCategory, setCommCategory] = useState<Community['category']>(currentComm.category || 'Gereja');
  const [commDescription, setCommDescription] = useState(
    currentComm.description || 'Komunitas gotong royong hijau merawat alam Danau Toba dan sekitarnya.',
  );
  const [commTreeTarget, setCommTreeTarget] = useState(currentComm.treeTarget || currentComm.targetTrees || 150);
  const [commActionTarget, setCommActionTarget] = useState(currentComm.actionTarget || currentComm.targetActions || 300);

  // New Event form
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('Sabtu, 28 November 2026');
  const [eventTime, setEventTime] = useState('08.00 - 12.00 WIB');
  const [eventLocation, setEventLocation] = useState('IAKN Tarutung & Sekitar Danau Toba');
  const [eventCategory, setEventCategory] = useState<GreenEvent['type']>('Penanaman Pohon');
  const [eventDesc, setEventDesc] = useState('');

  const refreshData = () => {
    setSubmissions(StorageService.getSubmissions());
    const comms = StorageService.getCommunities();
    setCommunities(comms);
    setEvents(StorageService.getEvents());
  };

  useEffect(() => {
    window.addEventListener('mh-data-updated', refreshData);
    window.addEventListener('mh-shared-data-change', refreshData);
    return () => {
      window.removeEventListener('mh-data-updated', refreshData);
      window.removeEventListener('mh-shared-data-change', refreshData);
    };
  }, []);

  const pendingSubmissions = submissions.filter((s) => s.verdict === 'perlu_tinjauan');
  const approvedSubmissions = submissions.filter((s) => s.verdict === 'valid');

  const handleReview = (id: string, verdict: 'valid' | 'tidak_valid') => {
    StorageService.updateSubmissionReview(id, verdict, `Pemimpin: ${user.name}`);
    refreshData();
  };

  const handleSaveCommunity = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedCommunity: Community = {
      ...currentComm,
      name: commName.trim(),
      category: commCategory,
      description: commDescription.trim(),
      treeTarget: Number(commTreeTarget),
      targetTrees: Number(commTreeTarget),
      actionTarget: Number(commActionTarget),
      targetActions: Number(commActionTarget),
    };
    StorageService.addCommunity(updatedCommunity);
    refreshData();
    setCommunitySaveSuccess(true);
    setTimeout(() => setCommunitySaveSuccess(false), 3000);
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;

    const newEvt: GreenEvent = {
      id: 'evt-' + Date.now(),
      title: eventTitle.trim(),
      type: eventCategory,
      date: eventDate,
      time: eventTime,
      location: eventLocation,
      organizer: commName.trim() || user.communityName,
      description: eventDesc.trim() || 'Aksi gotong royong hijau bersama civitas dan jemaat kawasan Danau Toba.',
      registeredCount: 1,
      isRegistered: true,
      qrCode: 'EVT-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
    };

    StorageService.addEvent(newEvt);
    setShowNewEventModal(false);
    setEventTitle('');
    setEventDesc('');
    refreshData();
  };

  // Tree and action completion rate
  const treeTarget = currentComm.treeTarget || currentComm.targetTrees || 150;
  const currentTrees = currentComm.treesPlanted || 0;
  const treeProgress = Math.min(100, Math.round((currentTrees / treeTarget) * 100));

  return (
    <div className="space-y-4 pb-24 pt-2 px-3 sm:px-4 print:p-0">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div>
          <div className="flex items-center gap-1.5 text-[#2E6B34] dark:text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Portal Pemimpin &amp; Pengelola
            </span>
          </div>
          <h2 className="text-xl font-bold font-poppins text-[#1F2A1F] dark:text-white">
            {commName}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Kelola aksi gotong royong jemaat, verifikasi bukti lapangan, dan pantau status Hutan Komunitas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refreshData}
            title="Segarkan Data"
            className="p-2 rounded-xl bg-white dark:bg-[#1A261C] border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:text-emerald-600 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setPrintReportModal(true)}
            className="touch-target inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2E6B34] text-white text-xs font-bold hover:bg-[#235328] transition active:scale-95 shadow-sm cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Unduh Laporan</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex overflow-x-auto pb-1 gap-1.5 border-b border-gray-200/80 dark:border-white/10 no-scrollbar print:hidden">
        {[
          { id: 'overview', label: 'Ringkasan & Hutan', icon: TrendingUp },
          { id: 'reviews', label: `Tinjau Bukti (${pendingSubmissions.length})`, icon: CheckCircle2 },
          { id: 'community', label: 'Kelola Komunitas', icon: Building },
          { id: 'events', label: 'Jadwal Event Aksi', icon: Calendar },
          { id: 'locations', label: 'Titik Peta Hijau', icon: MapPin },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as LeaderTab)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                isActive
                  ? 'bg-[#2E6B34] text-white shadow-xs'
                  : 'bg-white dark:bg-[#1A261C] border border-gray-200/80 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:text-[#2E6B34] dark:hover:text-emerald-400'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & COMMUNITY FOREST */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-4 rounded-3xl bg-white dark:bg-[#121E14] border border-gray-200/90 dark:border-white/10 shadow-xs">
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider block">
                Total Anggota
              </span>
              <span className="text-xl sm:text-2xl font-extrabold text-[#1F2A1F] dark:text-white block mt-0.5">
                {currentComm.memberCount} Jiwa
              </span>
              <span className="text-[11px] text-[#2E6B34] dark:text-emerald-400 font-medium block mt-1">
                Kategori: {currentComm.category || 'Gereja'}
              </span>
            </div>

            <div className="p-4 rounded-3xl bg-white dark:bg-[#121E14] border border-gray-200/90 dark:border-white/10 shadow-xs">
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider block">
                Poin Hijau Kolektif
              </span>
              <span className="text-xl sm:text-2xl font-extrabold text-[#2E6B34] dark:text-emerald-400 block mt-0.5">
                {currentComm.totalPoints.toLocaleString()}
              </span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium block mt-1">
                {currentComm.actionCount || 0} Aksi Disetujui
              </span>
            </div>

            <div className="p-4 rounded-3xl bg-white dark:bg-[#121E14] border border-gray-200/90 dark:border-white/10 shadow-xs">
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider block">
                Hutan Komunitas
              </span>
              <span className="text-xl sm:text-2xl font-extrabold text-emerald-700 dark:text-emerald-300 block mt-0.5">
                {currentTrees} Pohon
              </span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium block mt-1">
                Target: {treeTarget} Pohon
              </span>
            </div>

            <div className="p-4 rounded-3xl bg-white dark:bg-[#121E14] border border-gray-200/90 dark:border-white/10 shadow-xs">
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider block">
                Capaian Target Hutan
              </span>
              <span className="text-xl sm:text-2xl font-extrabold text-amber-600 dark:text-amber-400 block mt-0.5">
                {treeProgress}%
              </span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium block mt-1">
                {treeTarget - currentTrees > 0 ? `${treeTarget - currentTrees} pohon lagi` : 'Target Tercapai! 🎉'}
              </span>
            </div>
          </div>

          {/* Progress Bar & Cultural Motivation */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-[#FAF6EC] to-[#F1E8D5] dark:from-[#17251A] dark:to-[#0F1A12] border border-[#2E6B34]/20 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trees className="w-5 h-5 text-[#2E6B34] dark:text-emerald-400" />
                <h3 className="font-bold font-poppins text-sm text-[#1F2A1F] dark:text-white">
                  Status Hutan Komunitas: {commName}
                </h3>
              </div>
              <span className="text-xs font-extrabold text-[#2E6B34] dark:text-emerald-400">
                {currentTrees} / {treeTarget} Pohon ({treeProgress}%)
              </span>
            </div>

            <div className="w-full bg-gray-200/90 dark:bg-black/40 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#2E6B34] via-[#488B4E] to-emerald-400 h-full rounded-full transition-all duration-700"
                style={{ width: `${treeProgress}%` }}
              />
            </div>

            <p className="text-xs text-gray-700 dark:text-gray-300 italic">
              “Satu aksi gotong royong anggota Anda menumbuhkan dedaunan di kawasan Danau Toba. Setiap 150 Poin Hijau yang dikumpulkan anggota secara otomatis menumbuhkan 1 Pohon Endemik di Hutan Komunitas.”
            </p>
          </div>

          {/* Quick Action Shortcuts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => setActiveTab('reviews')}
              className="p-4 rounded-2xl bg-white dark:bg-[#121E14] border border-gray-200/90 dark:border-white/10 hover:border-[#2E6B34] dark:hover:border-emerald-500 text-left transition group shadow-xs cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-[#2E6B34] dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                  {pendingSubmissions.length} Perlu Tinjauan
                </span>
              </div>
              <h4 className="font-bold text-xs text-[#1F2A1F] dark:text-white group-hover:text-[#2E6B34] dark:group-hover:text-emerald-400">
                Tinjau Bukti Anggota
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                Verifikasi foto aksi kebun, daur ulang sampah, atau pembersihan.
              </p>
            </button>

            <button
              onClick={() => setActiveTab('community')}
              className="p-4 rounded-2xl bg-white dark:bg-[#121E14] border border-gray-200/90 dark:border-white/10 hover:border-[#2E6B34] dark:hover:border-emerald-500 text-left transition group shadow-xs cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                  <Building className="w-4 h-4" />
                </span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  Sinkron
                </span>
              </div>
              <h4 className="font-bold text-xs text-[#1F2A1F] dark:text-white group-hover:text-[#2E6B34] dark:group-hover:text-emerald-400">
                Kelola Profil Komunitas
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                Perbarui nama, target pohon, dan visibilitas di form pendaftaran anggota.
              </p>
            </button>

            <button
              onClick={() => setShowNewEventModal(true)}
              className="p-4 rounded-2xl bg-white dark:bg-[#121E14] border border-gray-200/90 dark:border-white/10 hover:border-[#2E6B34] dark:hover:border-emerald-500 text-left transition group shadow-xs cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400">
                  <CalendarPlus className="w-4 h-4" />
                </span>
                <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
                  + Jadwalkan
                </span>
              </div>
              <h4 className="font-bold text-xs text-[#1F2A1F] dark:text-white group-hover:text-[#2E6B34] dark:group-hover:text-emerald-400">
                Buat Event Gotong Royong
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                Buka pendaftaran aksi bersih, reboisasi, atau ibadah ekologis.
              </p>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: REVIEWS (TINJAU BUKTI ANGGOTA) */}
      {activeTab === 'reviews' && (
        <div className="rounded-3xl bg-white dark:bg-[#121E14] border border-[#2E6B34]/25 dark:border-white/10 p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold font-poppins text-[#1F2A1F] dark:text-white">
                Antrean Bukti Perlu Tinjauan ({pendingSubmissions.length})
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Bukti yang disetujui akan langsung menambah Poin Hijau anggota dan total pohon Hutan Komunitas.
              </p>
            </div>
            <span className="text-[10px] font-bold text-[#2E6B34] dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
              Hak Pemimpin
            </span>
          </div>

          {pendingSubmissions.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-500 dark:text-gray-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="font-semibold text-gray-700 dark:text-gray-300">
                Semua kiriman bukti aksi anggota telah tertinjau dengan tertib.
              </p>
              <p className="text-[11px]">
                Ajak jemaat dan pemuda menyelesaikan tantangan baru di Beranda atau Kalender Event!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  className="p-4 rounded-2xl bg-[#FAF6EC] dark:bg-[#18261B] border border-amber-200 dark:border-amber-900/50 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">{sub.challengeTitle}</h4>
                      <span className="text-xs text-gray-600 dark:text-gray-300 block">
                        Pengunggah: <strong>{sub.userName}</strong> &bull; Skor Verifikasi Sistem: {sub.confidence}%
                      </span>
                    </div>
                    <span className="text-xs font-extrabold text-[#2E6B34] dark:text-emerald-400 bg-white dark:bg-black/40 px-2 py-0.5 rounded-lg border border-emerald-300 dark:border-emerald-800">
                      +{sub.awardedPoints} Poin
                    </span>
                  </div>

                  <div className="flex gap-3">
                    {sub.imageThumbnail && sub.imageThumbnail.trim() ? (
                      <img
                        src={sub.imageThumbnail}
                        alt="Bukti foto"
                        className="w-20 h-20 rounded-xl object-cover border border-gray-300 dark:border-gray-700 shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-emerald-100/80 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800 flex items-center justify-center text-[#2E6B34] dark:text-emerald-400 shrink-0">
                        <Trees className="w-8 h-8" />
                      </div>
                    )}
                    <div className="text-xs text-gray-700 dark:text-gray-300 space-y-1.5 flex-1">
                      <p className="bg-white dark:bg-black/30 p-2.5 rounded-xl border border-gray-200 dark:border-white/10">
                        <strong>Catatan Lapangan:</strong> "{sub.userNotes || 'Tanpa catatan'}"
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">Analisis Otomatis: {sub.alasan}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-white/10">
                    <button
                      onClick={() => handleReview(sub.id, 'tidak_valid')}
                      className="flex-1 py-2 rounded-xl bg-red-100 dark:bg-red-950/60 hover:bg-red-200 dark:hover:bg-red-900 text-red-800 dark:text-red-300 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Tolak Bukti</span>
                    </button>
                    <button
                      onClick={() => handleReview(sub.id, 'valid')}
                      className="flex-1 py-2 rounded-xl bg-[#2E6B34] hover:bg-[#235328] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Setujui &amp; Tambah Poin</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: COMMUNITY PROFILE MANAGEMENT */}
      {activeTab === 'community' && (
        <div className="rounded-3xl bg-white dark:bg-[#121E14] border border-gray-200/90 dark:border-white/10 p-5 shadow-xs space-y-4">
          <div className="border-b border-gray-100 dark:border-white/10 pb-3">
            <h3 className="text-base font-bold font-poppins text-[#1F2A1F] dark:text-white flex items-center gap-2">
              <Building className="w-5 h-5 text-[#2E6B34] dark:text-emerald-400" />
              <span>Kelola Profil &amp; Target Komunitas</span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Data yang Anda simpan di sini akan otomatis muncul pada pilihan komunitas saat pendaftaran anggota baru dan pengeditan profil pengguna lain.
            </p>
          </div>

          {communitySaveSuccess && (
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Profil komunitas berhasil diperbarui dan tersinkronisasi ke seluruh aplikasi!</span>
            </div>
          )}

          <form onSubmit={handleSaveCommunity} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Nama Komunitas / Gereja / Kampus *
                </label>
                <input
                  type="text"
                  required
                  value={commName}
                  onChange={(e) => setCommName(e.target.value)}
                  placeholder="misal: HKBP Tarutung Kota atau Senat Mahasiswa IAKN"
                  className="w-full bg-white dark:bg-[#1A261C] border border-gray-300 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-[#1F2A1F] dark:text-white focus:border-[#2E6B34] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Kategori Organisasi
                </label>
                <select
                  value={commCategory}
                  onChange={(e) => setCommCategory(e.target.value as Community['category'])}
                  className="w-full bg-white dark:bg-[#1A261C] border border-gray-300 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-[#1F2A1F] dark:text-white focus:border-[#2E6B34] focus:outline-hidden"
                >
                  <option>Gereja</option>
                  <option>Kampus</option>
                  <option>Pemuda</option>
                  <option>Komunitas Warga</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                Deskripsi Visi Misi &amp; Komitmen Ekoteologi
              </label>
              <textarea
                rows={3}
                value={commDescription}
                onChange={(e) => setCommDescription(e.target.value)}
                placeholder="Tuliskan komitmen gotong royong dan mandat Kejadian 2:15 komunitas Anda..."
                className="w-full bg-white dark:bg-[#1A261C] border border-gray-300 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-[#1F2A1F] dark:text-white focus:border-[#2E6B34] focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Target Pohon Endemik (Hutan Komunitas)
                </label>
                <input
                  type="number"
                  min={10}
                  max={5000}
                  value={commTreeTarget}
                  onChange={(e) => setCommTreeTarget(Number(e.target.value))}
                  className="w-full bg-white dark:bg-[#1A261C] border border-gray-300 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-[#1F2A1F] dark:text-white focus:border-[#2E6B34] focus:outline-hidden"
                />
                <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 block">
                  Saat ini telah tertanam: {currentTrees} pohon.
                </span>
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Target Total Aksi Marsiadapari
                </label>
                <input
                  type="number"
                  min={20}
                  max={10000}
                  value={commActionTarget}
                  onChange={(e) => setCommActionTarget(Number(e.target.value))}
                  className="w-full bg-white dark:bg-[#1A261C] border border-gray-300 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-[#1F2A1F] dark:text-white focus:border-[#2E6B34] focus:outline-hidden"
                />
                <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 block">
                  Aksi terverifikasi: {currentComm.actionCount || 0} aksi.
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#2E6B34] hover:bg-[#235328] text-white text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Perubahan Komunitas</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: EVENTS MANAGEMENT */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-white dark:bg-[#121E14] border border-gray-200/90 dark:border-white/10 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold font-poppins text-[#1F2A1F] dark:text-white">
                Kelola Jadwal Event Aksi Gotong Royong
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Jadwalkan aksi bersih Danau Toba, pembibitan pohon buah, dan kebaktian padang hijau.
              </p>
            </div>
            <button
              onClick={() => setShowNewEventModal(true)}
              className="px-4 py-2 rounded-xl bg-[#2E6B34] hover:bg-[#235328] text-white text-xs font-bold transition flex items-center gap-2 shadow-sm shrink-0 cursor-pointer"
            >
              <CalendarPlus className="w-4 h-4" />
              <span>+ Buat Event Baru</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {events.map((evt) => (
              <div
                key={evt.id}
                className="p-4 rounded-2xl bg-white dark:bg-[#121E14] border border-gray-200/90 dark:border-white/10 shadow-xs space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-bold text-[#2E6B34] dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                    {evt.type}
                  </span>
                  <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
                    {evt.registeredCount} Peserta Terdaftar
                  </span>
                </div>
                <h4 className="font-bold text-sm text-[#1F2A1F] dark:text-white">
                  {evt.title}
                </h4>
                <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
                  <p className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{evt.date} &bull; {evt.time}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>{evt.location}</span>
                  </p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                  {evt.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: LOCATIONS REVIEW */}
      {activeTab === 'locations' && (
        <div className="rounded-3xl bg-white dark:bg-[#121E14] border border-gray-200/90 dark:border-white/10 p-4 shadow-xs">
          <MapLocationReviewPanel />
        </div>
      )}

      {/* Modal: Buat Event Baru */}
      {showNewEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-[#FAF6EC] dark:bg-[#121B14] border border-[#2E6B34]/25 dark:border-white/10 p-5 shadow-2xl space-y-3.5">
            <h3 className="text-sm font-bold font-poppins text-[#2E6B34] dark:text-emerald-400 pb-2 border-b dark:border-white/10">
              Jadwalkan Event / Ibadah Hijau Baru
            </h3>
            <form onSubmit={handleCreateEvent} className="space-y-2.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Judul Event *</label>
                <input
                  type="text"
                  required
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="misal: Gotong Royong Kebun Bibit IAKN"
                  className="w-full bg-white dark:bg-[#1A261C] border border-gray-300 dark:border-white/10 rounded-xl px-3 py-2 text-[#1F2A1F] dark:text-white focus:border-[#2E6B34] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Kategori Event</label>
                <select
                  value={eventCategory}
                  onChange={(e) => setEventCategory(e.target.value as GreenEvent['type'])}
                  className="w-full bg-white dark:bg-[#1A261C] border border-gray-300 dark:border-white/10 rounded-xl px-3 py-2 text-[#1F2A1F] dark:text-white focus:border-[#2E6B34] focus:outline-hidden"
                >
                  <option value="Penanaman Pohon">Penanaman Pohon</option>
                  <option value="Aksi Bersih">Aksi Bersih</option>
                  <option value="Ibadah Hijau">Ibadah Hijau</option>
                  <option value="Lokakarya Kompos">Lokakarya Kompos</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Tanggal</label>
                  <input
                    type="text"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full bg-white dark:bg-[#1A261C] border border-gray-300 dark:border-white/10 rounded-xl px-3 py-2 text-[#1F2A1F] dark:text-white focus:border-[#2E6B34] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Waktu</label>
                  <input
                    type="text"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    className="w-full bg-white dark:bg-[#1A261C] border border-gray-300 dark:border-white/10 rounded-xl px-3 py-2 text-[#1F2A1F] dark:text-white focus:border-[#2E6B34] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Lokasi</label>
                <input
                  type="text"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  className="w-full bg-white dark:bg-[#1A261C] border border-gray-300 dark:border-white/10 rounded-xl px-3 py-2 text-[#1F2A1F] dark:text-white focus:border-[#2E6B34] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Deskripsi Aksi</label>
                <textarea
                  rows={2}
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                  placeholder="Informasikan perlengkapan yang perlu dibawa (cangkul, tumbler, sarung tangan)..."
                  className="w-full bg-white dark:bg-[#1A261C] border border-gray-300 dark:border-white/10 rounded-xl px-3 py-2 text-[#1F2A1F] dark:text-white focus:border-[#2E6B34] focus:outline-hidden"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewEventModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!eventTitle.trim()}
                  className="flex-1 py-2 rounded-xl bg-[#2E6B34] text-white text-xs font-bold hover:bg-[#235328] disabled:opacity-50 transition shadow-md cursor-pointer"
                >
                  Terbitkan Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal / Print Preview for Sinode & Campus Report */}
      {printReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#121E14] border border-gray-300 dark:border-white/10 p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Header Document */}
            <div className="text-center border-b border-gray-200 dark:border-white/10 pb-4 space-y-1">
              <span className="text-[10px] font-bold tracking-widest uppercase text-[#7A5230] dark:text-emerald-400">
                Laporan Pertanggungjawaban Ekoteologis
              </span>
              <h3 className="text-base font-extrabold font-poppins text-[#1F2A1F] dark:text-white">
                Laporan Capaian Marsiadapari Hijau
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Organisasi: {commName} &bull; Kawasan Danau Toba
              </p>
              <p className="text-[10px] text-gray-400">
                Dicetak pada: {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}
              </p>
            </div>

            {/* Metric Summary Table */}
            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-gray-900 dark:text-white">I. Ringkasan Kuantitatif Dampak Ciptaan</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-gray-50 dark:bg-black/30 rounded-xl border border-gray-200 dark:border-white/10">
                  <span className="text-gray-500 dark:text-gray-400 block text-[10px]">Total Aksi Terverifikasi:</span>
                  <span className="text-sm font-bold text-[#2E6B34] dark:text-emerald-400">{approvedSubmissions.length + 32} Aksi</span>
                </div>
                <div className="p-2.5 bg-gray-50 dark:bg-black/30 rounded-xl border border-gray-200 dark:border-white/10">
                  <span className="text-gray-500 dark:text-gray-400 block text-[10px]">Pohon Endemik Hutan:</span>
                  <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300">{currentTrees} Pohon</span>
                </div>
                <div className="p-2.5 bg-gray-50 dark:bg-black/30 rounded-xl border border-gray-200 dark:border-white/10">
                  <span className="text-gray-500 dark:text-gray-400 block text-[10px]">Estimasi Sampah Terkelola:</span>
                  <span className="text-sm font-bold text-[#1F2A1F] dark:text-white">64.5 kg</span>
                </div>
                <div className="p-2.5 bg-gray-50 dark:bg-black/30 rounded-xl border border-gray-200 dark:border-white/10">
                  <span className="text-gray-500 dark:text-gray-400 block text-[10px]">Poin Kolektif:</span>
                  <span className="text-sm font-bold text-cyan-700 dark:text-cyan-400">{currentComm.totalPoints.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Theological Context */}
            <div className="space-y-1 text-xs text-gray-700 dark:text-gray-300 leading-relaxed border-t border-gray-200 dark:border-white/10 pt-2">
              <h4 className="font-bold text-gray-900 dark:text-white">II. Refleksi Teologis &amp; Gotong Royong</h4>
              <p>
                Melalui semangat Marsiadapari, civitas dan jemaat {commName} telah mengimplementasikan mandat Kejadian 2:15 dalam wujud nyata. Aksi ini berkontribusi menjaga kelestarian ekosistem Danau Toba dan mempererat kebersamaan antarwarga di Tapanuli.
              </p>
            </div>

            {/* Signatures */}
            <div className="pt-6 border-t border-gray-200 dark:border-white/10 flex justify-between text-center text-xs text-gray-800 dark:text-gray-200">
              <div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">Disusun oleh:</p>
                <div className="h-10" />
                <p className="font-bold">{user.name}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">Pemimpin Komunitas</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">Mengetahui:</p>
                <div className="h-10" />
                <p className="font-bold">Pimpinan Jemaat / Dosen IAKN</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">NIP / Jabatan Gerejawi</p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-white/10">
              <button
                onClick={() => setPrintReportModal(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300"
              >
                Tutup
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 rounded-xl bg-[#2E6B34] text-white text-xs font-bold hover:bg-[#235328] transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak / Simpan PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
