import React, { useState } from 'react';
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
} from 'lucide-react';
import { User, ChallengeSubmission, GreenEvent } from '../types';
import { StorageService } from '../services/storageService';
import { MapLocationReviewPanel } from '../components/MapLocationReviewPanel';

interface LeaderDashboardProps {
  user: User;
  onOpenCreateEvent?: () => void;
}

export const LeaderDashboardPage: React.FC<LeaderDashboardProps> = ({ user }) => {
  const [submissions, setSubmissions] = useState<ChallengeSubmission[]>(StorageService.getSubmissions());
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [printReportModal, setPrintReportModal] = useState(false);

  // New Event form
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('Sabtu, 21 November 2026');
  const [eventTime, setEventTime] = useState('08.00 - 12.00 WIB');
  const [eventLocation, setEventLocation] = useState('Kampus Sipoholon IAKN Tarutung');
  const [eventDesc, setEventDesc] = useState('');

  const pendingSubmissions = submissions.filter((s) => s.verdict === 'perlu_tinjauan');
  const approvedSubmissions = submissions.filter((s) => s.verdict === 'valid');

  const communities = StorageService.getCommunities();
  const currentComm = communities.find((c) => c.id === user.communityId) || communities[0];

  const handleReview = (id: string, verdict: 'valid' | 'tidak_valid') => {
    StorageService.updateSubmissionReview(id, verdict, `Pemimpin: ${user.name}`);
    setSubmissions(StorageService.getSubmissions());
  };

  const handleCreateEvent = () => {
    if (!eventTitle.trim()) return;

    const newEvt: GreenEvent = {
      id: 'evt-' + Date.now(),
      title: eventTitle.trim(),
      type: 'Aksi Bersih',
      date: eventDate,
      time: eventTime,
      location: eventLocation,
      organizer: user.communityName,
      description: eventDesc.trim() || 'Aksi gotong royong hijau bersama jemaat dan civitas IAKN Tarutung.',
      registeredCount: 1,
      isRegistered: true,
      qrCode: 'EVT-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
    };

    StorageService.addEvent(newEvt);
    setShowNewEventModal(false);
    setEventTitle('');
    setEventDesc('');
  };

  return (
    <div className="space-y-4 pb-24 pt-2 px-4 print:p-0">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <div className="flex items-center gap-1.5 text-[#2E6B34]">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Dashboard Organisasi
            </span>
          </div>
          <h2 className="text-lg font-bold font-poppins text-[#1F2A1F]">
            Dashboard Pemimpin
          </h2>
        </div>

        <button
          onClick={() => setPrintReportModal(true)}
          className="touch-target inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2E6B34] text-white text-xs font-bold hover:bg-[#235328] transition active:scale-95 shadow-xs"
        >
          <FileDown className="w-3.5 h-3.5" />
          <span>Laporan</span>
        </button>
      </div>

      {/* Community Overview Cards */}
      <div className="grid grid-cols-2 gap-2.5 print:hidden">
        <div className="p-4 rounded-3xl bg-white border border-gray-200/90 shadow-xs">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">
            Total Anggota Aktif
          </span>
          <span className="text-xl font-extrabold text-[#1F2A1F] block mt-0.5">
            {currentComm.memberCount} Orang
          </span>
          <span className="text-[11px] text-[#2E6B34] font-medium block mt-1">
            {currentComm.name.split('(')[0]}
          </span>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-gray-200/90 shadow-xs">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">
            Total Poin Kolektif
          </span>
          <span className="text-xl font-extrabold text-[#2E6B34] block mt-0.5">
            {currentComm.totalPoints.toLocaleString()}
          </span>
          <span className="text-[11px] text-emerald-700 font-medium block mt-1">
            🌲 {currentComm.treesPlanted} Pohon Tertanam
          </span>
        </div>
      </div>

      {/* Review Queue (Tinjau Bukti Anggota) */}
      <div className="rounded-3xl bg-white border border-[#2E6B34]/25 p-4 shadow-sm space-y-3 print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold font-poppins text-[#1F2A1F]">
              Antrean Bukti Perlu Tinjauan ({pendingSubmissions.length})
            </h3>
          </div>
          <span className="text-[10px] text-gray-500 font-semibold">
            Keputusan Akhir Pemimpin
          </span>
        </div>

        {pendingSubmissions.length === 0 ? (
          <div className="py-4 text-center text-xs text-gray-500 italic">
            Semua kiriman bukti anggota telah tertinjau dengan tertib.
          </div>
        ) : (
          <div className="space-y-3">
            {pendingSubmissions.map((sub) => (
              <div
                key={sub.id}
                className="p-3.5 rounded-2xl bg-[#FAF6EC] border border-amber-200 space-y-2.5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">{sub.challengeTitle}</h4>
                    <span className="text-[10px] text-gray-600 block">
                      Pengunggah: <strong>{sub.userName}</strong> &bull; Skor AI: {sub.confidence}%
                    </span>
                  </div>
                  <span className="text-xs font-bold text-[#2E6B34]">+{sub.awardedPoints} Poin</span>
                </div>

                <div className="flex gap-2.5">
                  <img
                    src={sub.imageThumbnail}
                    alt="Bukti foto"
                    className="w-16 h-16 rounded-xl object-cover border border-gray-300 shrink-0"
                  />
                  <div className="text-[11px] text-gray-700 space-y-1">
                    <p className="bg-white p-2 rounded-lg border border-gray-200">
                      Catatan: "{sub.userNotes || 'Tanpa catatan'}"
                    </p>
                    <p className="text-gray-500">Analisis AI: {sub.alasan}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-1 border-t border-gray-200">
                  <button
                    onClick={() => handleReview(sub.id, 'tidak_valid')}
                    className="flex-1 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold flex items-center justify-center gap-1 transition"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Tolak</span>
                  </button>
                  <button
                    onClick={() => handleReview(sub.id, 'valid')}
                    className="flex-1 py-1.5 rounded-xl bg-[#2E6B34] hover:bg-[#235328] text-white text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Setujui Bukti</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="print:hidden">
        <MapLocationReviewPanel />
      </div>

      {/* Quick Action: Buat Event Baru */}
      <div className="rounded-3xl bg-white border border-gray-200/90 p-4 shadow-xs flex items-center justify-between print:hidden">
        <div>
          <h4 className="text-xs font-bold text-gray-900">Buat Event / Ibadah Hijau</h4>
          <p className="text-[10px] text-gray-500">Jadwalkan aksi gotong royong jemaat dan pemuda</p>
        </div>
        <button
          onClick={() => setShowNewEventModal(true)}
          className="touch-target px-3.5 py-2 rounded-xl bg-[#2E6B34] text-white text-xs font-bold hover:bg-[#235328] transition flex items-center gap-1.5 shadow-sm"
        >
          <CalendarPlus className="w-4 h-4" />
          <span>Jadwalkan</span>
        </button>
      </div>

      {/* Modal: Buat Event */}
      {showNewEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-[#FAF6EC] border border-[#2E6B34]/25 p-5 shadow-2xl space-y-3.5">
            <h3 className="text-sm font-bold font-poppins text-[#2E6B34] pb-2 border-b">
              Jadwalkan Event / Ibadah Hijau Baru
            </h3>
            <div className="space-y-2 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Judul Event *</label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="misal: Gotong Royong Kebun Bibit IAKN"
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-[#1F2A1F] focus:border-[#2E6B34] focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Tanggal</label>
                <input
                  type="text"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-[#1F2A1F] focus:border-[#2E6B34] focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Waktu</label>
                <input
                  type="text"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-[#1F2A1F] focus:border-[#2E6B34] focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Lokasi</label>
                <input
                  type="text"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-[#1F2A1F] focus:border-[#2E6B34] focus:outline-hidden"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewEventModal(false)}
                className="px-3 py-2 text-xs font-semibold text-gray-600"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!eventTitle.trim()}
                onClick={handleCreateEvent}
                className="flex-1 py-2.5 rounded-xl bg-[#2E6B34] text-white text-xs font-bold hover:bg-[#235328] disabled:opacity-50 transition shadow-md"
              >
                Terbitkan Event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal / Print Preview for Sinode & Campus Report */}
      {printReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white border border-gray-300 p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Header Document */}
            <div className="text-center border-b pb-4 space-y-1">
              <span className="text-[10px] font-bold tracking-widest uppercase text-[#7A5230]">
                Laporan Pertanggungjawaban Ekoteologis
              </span>
              <h3 className="text-base font-extrabold font-poppins text-[#1F2A1F]">
                Laporan Capaian Marsiadapari Hijau
              </h3>
              <p className="text-xs text-gray-600">
                Civitas Akademika {currentComm.name} &bull; Kawasan Danau Toba
              </p>
              <p className="text-[10px] text-gray-400">
                Dicetak pada: {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}
              </p>
            </div>

            {/* Metric Summary Table */}
            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-gray-900">I. Ringkasan Kuantitatif Dampak Ciptaan</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-gray-50 rounded-xl border">
                  <span className="text-gray-500 block text-[10px]">Total Aksi Terverifikasi:</span>
                  <span className="text-sm font-bold text-[#2E6B34]">{approvedSubmissions.length + 32} Aksi</span>
                </div>
                <div className="p-2.5 bg-gray-50 rounded-xl border">
                  <span className="text-gray-500 block text-[10px]">Pohon Endemik Tertanam:</span>
                  <span className="text-sm font-bold text-green-800">{currentComm.treesPlanted} Pohon</span>
                </div>
                <div className="p-2.5 bg-gray-50 rounded-xl border">
                  <span className="text-gray-500 block text-[10px]">Estimasi Sampah Plastik Dicegah:</span>
                  <span className="text-sm font-bold text-[#1F2A1F]">48.5 kg</span>
                </div>
                <div className="p-2.5 bg-gray-50 rounded-xl border">
                  <span className="text-gray-500 block text-[10px]">Air Bersih Dihemat:</span>
                  <span className="text-sm font-bold text-cyan-700">1,420 Liter</span>
                </div>
              </div>
            </div>

            {/* Theological Context */}
            <div className="space-y-1 text-xs text-gray-700 leading-relaxed border-t pt-2">
              <h4 className="font-bold text-gray-900">II. Refleksi Teologis &amp; Gotong Royong</h4>
              <p>
                Melalui semangat Marsiadapari, civitas dan jemaat telah mengimplementasikan mandat Kejadian 2:15 dalam wujud nyata. Aksi ini berkontribusi menjaga kelestarian ekosistem Danau Toba dan mempererat kebersamaan antarwarga di Tapanuli Utara.
              </p>
            </div>

            {/* Signatures */}
            <div className="pt-6 border-t flex justify-between text-center text-xs text-gray-800">
              <div>
                <p className="text-[10px] text-gray-500">Disusun oleh:</p>
                <div className="h-10" />
                <p className="font-bold">{user.name}</p>
                <p className="text-[10px] text-gray-500">Koordinator Hijau</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500">Mengetahui:</p>
                <div className="h-10" />
                <p className="font-bold">Pimpinan Jemaat / Dosen IAKN</p>
                <p className="text-[10px] text-gray-500">NIP / Jabatan Gerejawi</p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-3 border-t">
              <button
                onClick={() => setPrintReportModal(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600"
              >
                Tutup
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 rounded-xl bg-[#2E6B34] text-white text-xs font-bold hover:bg-[#235328] transition flex items-center justify-center gap-1.5 shadow-md"
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
