import React, { useState, useRef } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Sparkles,
  Camera,
  RotateCw,
  Trees,
  Droplets,
  Zap,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { Challenge, User, ChallengeSubmission } from '../types';
import { compressImage } from '../services/imageCompression';
import { StorageService } from '../services/storageService';
import { AIService } from '../services/aiService';

interface VerifyProofModalProps {
  challenge: Challenge;
  user: User;
  onClose: () => void;
  onSuccess: (submission: ChallengeSubmission) => void;
}

export const VerifyProofModal: React.FC<VerifyProofModalProps> = ({
  challenge,
  user,
  onClose,
  onSuccess,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageHash, setImageHash] = useState<string>('');
  const [userNotes, setUserNotes] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [result, setResult] = useState<ChallengeSubmission | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalysisError(null);
    if (!file.type.startsWith('image/')) {
      setAnalysisError('Pilih berkas gambar yang didukung.');
      e.target.value = '';
      return;
    }

    try {
      const { dataUrl, hash } = await compressImage(file, 800, 800, 0.75);

      if (StorageService.isDuplicateImageHash(hash)) {
        setAnalysisError('Peringatan: Foto ini tampaknya pernah digunakan sebelumnya. Silakan gunakan foto bukti aksi nyata yang baru.');
        return;
      }

      setSelectedImage(dataUrl);
      setImageHash(hash);
    } catch {
      setAnalysisError('Gagal memproses foto. Silakan coba lagi.');
    }
  };

  const handleStartAnalysis = async () => {
    if (!selectedImage) return;

    setAnalyzing(true);
    setAnalysisError(null);

    try {
      const { data } = await AIService.verifyChallengeProof(
        selectedImage,
        challenge.title,
        challenge.category,
        userNotes
      );

      let finalVerdict: 'valid' | 'perlu_tinjauan' | 'tidak_valid' = data.verdict;
      if (finalVerdict === 'valid' && data.confidence < 75) {
        finalVerdict = 'perlu_tinjauan';
      }

      const submission: ChallengeSubmission = {
        id: 'sub-' + Date.now(),
        userId: user.id,
        userName: user.name,
        isAnonymous: user.preferences.isAnonymous,
        challengeId: challenge.id,
        challengeTitle: challenge.title,
        category: challenge.category,
        submittedAt: new Date().toISOString(),
        imageThumbnail: selectedImage,
        imageHash: imageHash,
        userNotes,
        verdict: finalVerdict,
        confidence: data.confidence,
        yang_terlihat: data.yang_terlihat,
        alasan: data.alasan,
        saran: data.saran,
        impact: {
          wasteKg: data.estimasi_dampak?.sampah_kg || 0,
          trees: data.estimasi_dampak?.pohon || 0,
          waterLiters: data.estimasi_dampak?.air_liter || 0,
          electricityKwh: data.estimasi_dampak?.listrik_kwh || 0,
        },
        awardedPoints: finalVerdict === 'valid' ? challenge.points : 0,
      };

      StorageService.addSubmission(submission);
      setResult(submission);
      onSuccess(submission);
    } catch (error) {
      setAnalysisError(
        error instanceof Error
          ? error.message
          : 'Terjadi kendala saat menganalisis foto. Silakan coba lagi.',
      );
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-2 backdrop-blur-xs sm:items-center sm:p-4">
      <div className="my-auto flex max-h-[calc(100dvh-1rem)] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-[#2E6B34]/25 bg-[#FAF6EC] shadow-2xl sm:max-h-[92dvh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-[#2E6B34] to-[#1B4320] text-white flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#A8D5A2]">
              Verifikasi Bukti Aksi
            </span>
            <h3 className="text-sm font-bold font-poppins truncate max-w-[260px]">
              {challenge.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="touch-target p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 overflow-y-auto p-4 sm:p-5">
          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Peringatan Privasi:</span>
              Mohon tidak memotret wajah orang lain tanpa izin. Foto dikompresi di browser Anda dan dianalisis secara aman.
            </div>
          </div>

          {!result ? (
            <>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700">
                  Foto Bukti Pelaksanaan
                </label>

                {selectedImage ? (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-[#2E6B34] aspect-video bg-black/5 flex items-center justify-center">
                    <img
                      src={selectedImage}
                      alt="Bukti Aksi"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedImage(null);
                        setImageHash('');
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80"
                      title="Ganti Foto"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="group flex min-h-36 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#2E6B34]/40 bg-white p-5 text-center transition hover:border-[#2E6B34] sm:p-6"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#A8D5A2]/30 text-[#2E6B34] transition group-hover:scale-110">
                      <Camera className="w-6 h-6" />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-[#1F2A1F]">
                        Ambil Foto atau Pilih dari Galeri
                      </p>
                      <p className="text-[11px] text-gray-500">
                        Pastikan objek aksi terlihat jelas
                      </p>
                    </div>
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Catatan Singkat Aksi (Opsional)
                </label>
                <input
                  type="text"
                  value={userNotes}
                  onChange={(e) => setUserNotes(e.target.value)}
                  placeholder="misal: Membawa tumbler saat kuliah di Gedung B IAKN"
                  className="w-full text-xs bg-white border border-gray-300 rounded-xl px-3 py-2 text-[#1F2A1F] focus:border-[#2E6B34] focus:outline-hidden"
                />
              </div>

              {analysisError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl border border-red-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{analysisError}</span>
                </div>
              )}

              {analyzing && (
                <div className="p-4 bg-white rounded-2xl border border-[#2E6B34]/30 text-center space-y-2 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-[#A8D5A2]/30 text-[#2E6B34] mx-auto flex items-center justify-center">
                    <Sparkles className="w-5 h-5 animate-spin" />
                  </div>
                  <h4 className="text-xs font-bold text-[#2E6B34] font-poppins">
                    AI sedang memeriksa bukti gotong royong...
                  </h4>
                  <p className="text-[11px] text-gray-500">
                    Menganalisis kesesuaian objek dan menghitung estimasi dampak lingkungan
                  </p>
                </div>
              )}

              {!analyzing && (
                <button
                  type="button"
                  disabled={!selectedImage}
                  onClick={handleStartAnalysis}
                  className="w-full py-3 rounded-xl bg-[#2E6B34] text-white text-xs font-bold hover:bg-[#235328] disabled:opacity-40 transition active:scale-95 shadow-md flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-[#A8D5A2]" />
                  <span>Verifikasi Bukti dengan AI</span>
                </button>
              )}
            </>
          ) : (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div
                className={`p-4 rounded-2xl border text-center space-y-1.5 ${
                  result.verdict === 'valid'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : result.verdict === 'perlu_tinjauan'
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-red-50 border-red-300 text-red-900'
                }`}
              >
                <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-1 bg-white shadow-xs">
                  {result.verdict === 'valid' ? (
                    <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                  ) : result.verdict === 'perlu_tinjauan' ? (
                    <AlertCircle className="w-7 h-7 text-amber-600" />
                  ) : (
                    <XCircle className="w-7 h-7 text-red-600" />
                  )}
                </div>

                <div className="text-xs uppercase font-extrabold tracking-wider">
                  {result.verdict === 'valid'
                    ? 'Bukti Sah Terverifikasi!'
                    : result.verdict === 'perlu_tinjauan'
                    ? 'Perlu Tinjauan Rekan / Pemimpin'
                    : 'Bukti Belum Memenuhi Syarat'}
                </div>

                <div className="text-sm font-bold">
                  {result.verdict === 'valid' && (
                    <span className="text-[#2E6B34]">+{result.awardedPoints} Poin Hijau Diberikan!</span>
                  )}
                  {result.verdict === 'perlu_tinjauan' && (
                    <span>Masuk Antrean Konfirmasi Kelompok</span>
                  )}
                  {result.verdict === 'tidak_valid' && (
                    <span>Silakan ambil foto bukti yang lebih relevan</span>
                  )}
                </div>

                <div className="text-[11px] opacity-80">
                  Tingkat Keyakinan AI: <strong>{result.confidence}%</strong>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-gray-200 text-xs space-y-2 text-gray-700">
                <div>
                  <span className="font-bold text-gray-900 block">Yang Terlihat:</span>
                  <p className="mt-0.5">{result.yang_terlihat}</p>
                </div>
                <div>
                  <span className="font-bold text-gray-900 block">Alasan Analisis:</span>
                  <p className="mt-0.5">{result.alasan}</p>
                </div>
                <div>
                  <span className="font-bold text-gray-900 block">Saran Berkelanjutan:</span>
                  <p className="mt-0.5">{result.saran}</p>
                </div>
              </div>

              {result.verdict === 'valid' && (
                <div className="bg-[#A8D5A2]/20 p-3 rounded-2xl border border-[#2E6B34]/20">
                  <span className="text-[11px] font-bold text-[#2E6B34] block mb-1.5 uppercase">
                    Kontribusi Ciptaan Tercatat:
                  </span>
                  <div className="grid grid-cols-4 gap-1.5 text-center">
                    <div className="bg-white p-1.5 rounded-xl border border-gray-200">
                      <Trash2 className="w-3.5 h-3.5 mx-auto text-emerald-600 mb-0.5" />
                      <span className="text-xs font-bold block">{result.impact.wasteKg} kg</span>
                      <span className="text-[9px] text-gray-500">Sampah</span>
                    </div>
                    <div className="bg-white p-1.5 rounded-xl border border-gray-200">
                      <Trees className="w-3.5 h-3.5 mx-auto text-green-700 mb-0.5" />
                      <span className="text-xs font-bold block">{result.impact.trees}</span>
                      <span className="text-[9px] text-gray-500">Pohon</span>
                    </div>
                    <div className="bg-white p-1.5 rounded-xl border border-gray-200">
                      <Droplets className="w-3.5 h-3.5 mx-auto text-cyan-600 mb-0.5" />
                      <span className="text-xs font-bold block">{result.impact.waterLiters} L</span>
                      <span className="text-[9px] text-gray-500">Air</span>
                    </div>
                    <div className="bg-white p-1.5 rounded-xl border border-gray-200">
                      <Zap className="w-3.5 h-3.5 mx-auto text-amber-500 mb-0.5" />
                      <span className="text-xs font-bold block">{result.impact.electricityKwh}</span>
                      <span className="text-[9px] text-gray-500">kWh</span>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-[10px] text-gray-500 text-center italic">
                *AI Verifikator adalah alat bantu pendukung. Keputusan akhir dapat ditinjau oleh pimpinan komunitas atau dosen IAKN.
              </p>

              <div className="flex gap-2">
                {result.verdict !== 'valid' && (
                  <button
                    type="button"
                    onClick={() => {
                      setResult(null);
                      setSelectedImage(null);
                      setImageHash('');
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold transition"
                  >
                    Unggah Ulang
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl bg-[#2E6B34] text-white text-xs font-bold hover:bg-[#235328] transition active:scale-95"
                >
                  Selesai
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
