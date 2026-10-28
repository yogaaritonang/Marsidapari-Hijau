import React, { useState, useRef } from 'react';
import {
  AlertTriangle,
  Camera,
  MapPin,
  Sparkles,
  CheckCircle2,
  Clock,
  Plus,
  X,
  RotateCw,
} from 'lucide-react';
import { EnvironmentalReport, User } from '../types';
import { StorageService } from '../services/storageService';
import { compressImage } from '../services/imageCompression';
import { AIService } from '../services/aiService';

interface ReportsPageProps {
  user: User;
  isGuest: boolean;
  onRequireAuth: () => void;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ user, isGuest, onRequireAuth }) => {
  const [reports, setReports] = useState<EnvironmentalReport[]>(StorageService.getReports());
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<
    'Sampah Menumpuk' | 'Pencemaran Danau Toba / Sungai' | 'Penebangan Liar' | 'Kerusakan Lahan'
  >('Sampah Menumpuk');
  const [locationName, setLocationName] = useState('Bantaran Sungai Sigeaon, Tarutung');
  const [rawNotes, setRawNotes] = useState('');
  const [formalDescription, setFormalDescription] = useState('');
  const [recommendedAction, setRecommendedAction] = useState('');
  const [urgency, setUrgency] = useState<'Rendah' | 'Sedang' | 'Tinggi'>('Sedang');
  const [photo, setPhoto] = useState<string | null>(null);
  const [polishingWithAi, setPolishingWithAi] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { dataUrl } = await compressImage(file, 800, 800, 0.75);
      setPhoto(dataUrl);
    } catch {
      // Handled
    }
  };

  const handleAiPolish = async () => {
    if (!rawNotes.trim() && !title.trim()) return;

    setPolishingWithAi(true);
    try {
      const result = await AIService.assistReport(
        title || 'Laporan Temuan Lingkungan',
        rawNotes,
        category,
        locationName
      );

      setFormalDescription(result.formalDescription);
      setRecommendedAction(result.recommendedAction);
      setUrgency((result.urgency as any) || 'Sedang');
    } catch {
      // Handled
    } finally {
      setPolishingWithAi(false);
    }
  };

  const handleSaveReport = () => {
    if (!title.trim() || !locationName.trim()) return;

    const newReport: EnvironmentalReport = {
      id: 'rep-' + Date.now(),
      title: title.trim(),
      category,
      locationName: locationName.trim(),
      coordinates: [
        2.0235 + (Math.random() - 0.5) * 0.04,
        98.9668 + (Math.random() - 0.5) * 0.04,
      ],
      rawNotes: rawNotes.trim(),
      formalDescription:
        formalDescription.trim() ||
        `Laporan resmi warga mengenai ${category} di ${locationName}. Diperlukan koordinasi gotong royong pembersihan.`,
      recommendedAction:
        recommendedAction.trim() || 'Jadwalkan aksi gotong royong Marsiadapari jemaat.',
      urgency,
      status: 'Dilaporkan',
      reportedBy: user.name,
      reportedAt: new Date().toISOString(),
      photoUrl: photo || undefined,
    };

    StorageService.addReport(newReport);
    setReports(StorageService.getReports());
    setShowCreateModal(false);

    // Reset
    setTitle('');
    setRawNotes('');
    setFormalDescription('');
    setRecommendedAction('');
    setPhoto(null);
  };

  const getUrgencyBadge = (urg: string) => {
    if (urg === 'Tinggi') return 'bg-red-100 text-red-800 border-red-200';
    if (urg === 'Sedang') return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  };

  const getStatusBadge = (st: string) => {
    if (st === 'Selesai') return 'bg-emerald-600 text-white';
    if (st === 'Gotong Royong Dijadwalkan') return 'bg-[#2E6B34] text-white';
    if (st === 'Ditinjau Pemimpin') return 'bg-amber-500 text-white';
    return 'bg-gray-500 text-white';
  };

  return (
    <div className="space-y-4 pb-24 pt-2 px-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-[#7A5230] uppercase tracking-wider">
            Pengaduan Warga &amp; Jemaat
          </span>
          <h2 className="text-lg font-bold font-poppins text-[#1F2A1F]">
            Lapor Masalah Lingkungan
          </h2>
        </div>

        <button
          onClick={() => {
            if (isGuest) {
              onRequireAuth();
              return;
            }
            setShowCreateModal(true);
          }}
          className="touch-target inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2E6B34] text-white text-xs font-bold hover:bg-[#235328] transition active:scale-95 shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Buat Laporan</span>
        </button>
      </div>

      <p className="text-xs text-gray-600">
        Laporkan titik sampah liar, pencemaran aliran Sungai Sigeaon / Danau Toba, atau perusakan tebing agar dapat ditindaklanjuti aksi Marsiadapari.
      </p>

      {/* Reports Feed */}
      <div className="space-y-3">
        {reports.length === 0 && (
          <div className="rounded-3xl border border-dashed border-[#2E6B34]/25 bg-white p-8 text-center">
            <MapPin className="mx-auto h-8 w-8 text-[#2E6B34]/50" />
            <p className="mt-3 text-sm font-bold text-[#1F2A1F]">Belum ada laporan lingkungan</p>
            <p className="mt-1 text-xs text-gray-500">Laporan yang dikirim akan ditampilkan di sini.</p>
          </div>
        )}
        {reports.map((rep) => (
          <div
            key={rep.id}
            className="p-4 rounded-3xl bg-white border border-gray-200 shadow-xs space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${getUrgencyBadge(
                      rep.urgency
                    )}`}
                  >
                    Urgensi {rep.urgency}
                  </span>
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${getStatusBadge(
                      rep.status
                    )}`}
                  >
                    {rep.status}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-[#1F2A1F] leading-snug">
                  {rep.title}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-[#7A5230] font-semibold">
              <MapPin className="w-3.5 h-3.5" />
              <span>{rep.locationName}</span>
            </div>

            <p className="text-xs text-gray-700 leading-relaxed bg-[#FAF6EC] p-3 rounded-2xl border border-gray-100">
              {rep.formalDescription}
            </p>

            {rep.recommendedAction && (
              <div className="text-xs text-[#2E6B34] font-medium bg-[#A8D5A2]/20 p-2.5 rounded-xl border border-[#2E6B34]/15">
                <strong>Rencana Tindak Lanjut:</strong> {rep.recommendedAction}
              </div>
            )}

            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-500">
              <span>Dilaporkan oleh: {rep.reportedBy}</span>
              <span>{new Date(rep.reportedAt).toLocaleDateString('id-ID')}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Create Report Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-[#FAF6EC] border border-[#2E6B34]/25 p-5 shadow-2xl space-y-3.5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b">
              <div className="flex items-center gap-2 text-[#2E6B34]">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-bold font-poppins">
                  Lapor Masalah Lingkungan
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Judul Masalah *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="misal: Sampah Plastik Menumpuk di Muara Sungai"
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-[#1F2A1F] focus:border-[#2E6B34] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Kategori Masalah
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-[#1F2A1F] focus:border-[#2E6B34] focus:outline-hidden"
                >
                  <option value="Sampah Menumpuk">Sampah Menumpuk</option>
                  <option value="Pencemaran Danau Toba / Sungai">Pencemaran Danau Toba / Sungai</option>
                  <option value="Penebangan Liar">Penebangan Liar</option>
                  <option value="Kerusakan Lahan">Kerusakan Lahan</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Lokasi / Patokan Tempat *
                </label>
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="misal: Jembatan Pasar Tarutung / Pantai Muara"
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-[#1F2A1F] focus:border-[#2E6B34] focus:outline-hidden"
                />
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Foto Bukti Kondisi
                </label>
                {photo ? (
                  <div className="relative rounded-2xl overflow-hidden aspect-video border border-gray-300 bg-black/5">
                    <img src={photo} alt="Foto kondisi" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhoto(null)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3 bg-white border border-dashed border-gray-300 rounded-xl flex items-center justify-center gap-2 text-gray-600 hover:border-[#2E6B34]"
                  >
                    <Camera className="w-4 h-4 text-[#2E6B34]" />
                    <span>Ambil Foto Masalah</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>

              {/* Raw notes and AI Polish Button */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-gray-700">
                    Catatan Temuan Lapangan
                  </label>
                  <button
                    type="button"
                    onClick={handleAiPolish}
                    disabled={polishingWithAi || !rawNotes.trim()}
                    className="text-[11px] font-bold text-[#2E6B34] hover:underline flex items-center gap-1 disabled:opacity-40"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>{polishingWithAi ? 'Merumuskan...' : 'Rapikan Deskripsi AI'}</span>
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={rawNotes}
                  onChange={(e) => setRawNotes(e.target.value)}
                  placeholder="Ketik catatan bebas temuanmu di lapangan..."
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-[#1F2A1F] focus:border-[#2E6B34] focus:outline-hidden resize-none"
                />
              </div>

              {formalDescription && (
                <div className="p-3 bg-white rounded-xl border border-[#2E6B34]/30 space-y-1">
                  <span className="font-bold text-[#2E6B34] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Deskripsi Resmi Hasil Rumusan AI:
                  </span>
                  <p className="text-gray-700 text-[11px] leading-relaxed">
                    {formalDescription}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-3 py-2 text-xs font-semibold text-gray-600"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!title.trim() || !locationName.trim()}
                onClick={handleSaveReport}
                className="flex-1 py-2.5 rounded-xl bg-[#2E6B34] text-white text-xs font-bold hover:bg-[#235328] disabled:opacity-50 transition active:scale-95 shadow-md"
              >
                Kirim Laporan Warga
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
