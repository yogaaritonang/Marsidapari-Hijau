import React, { useState, useRef } from 'react';
import {
  Camera,
  Trash2,
  Sparkles,
  MapPin,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Info,
} from 'lucide-react';
import { WasteScanResult } from '../../api/waste-scan';
import { compressImage } from '../services/imageCompression';
import { AIService } from '../services/aiService';

interface WasteScannerPageProps {
  onOpenMap: () => void;
  isGuest: boolean;
  onRequireAuth: () => void;
}

export const WasteScannerPage: React.FC<WasteScannerPageProps> = ({ onOpenMap, isGuest, onRequireAuth }) => {
  const [image, setImage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<WasteScanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (isGuest) {
      e.target.value = '';
      onRequireAuth();
      return;
    }

    setErrorMsg(null);
    setScanResult(null);

    try {
      const { dataUrl } = await compressImage(file, 800, 800, 0.75);
      setImage(dataUrl);

      // Trigger automatic scan
      setScanning(true);
      const { data } = await AIService.scanWaste(dataUrl);
      setScanResult(data);
    } catch {
      setErrorMsg('Gagal memproses gambar sampah. Silakan coba kembali.');
    } finally {
      setScanning(false);
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'organik':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'plastik':
        return 'bg-cyan-50 text-cyan-800 border-cyan-300';
      case 'kertas':
        return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'b3':
        return 'bg-red-50 text-red-800 border-red-300';
      case 'logam':
        return 'bg-slate-100 text-slate-800 border-slate-300';
      case 'kaca':
        return 'bg-teal-50 text-teal-800 border-teal-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="space-y-4 pb-24 pt-2 px-4">
      {/* Header */}
      <div>
        <span className="text-xs font-bold text-[#7A5230] uppercase tracking-wider">
          Pilah &amp; Daur Ulang
        </span>
        <h2 className="text-lg font-bold font-poppins text-[#1F2A1F]">
          Pemindai Sampah AI
        </h2>
        <p className="text-xs text-gray-600 mt-0.5">
          Potret sampah untuk mengenali jenis dan lokasi bank sampah terdekat di Tarutung
        </p>
      </div>

      {/* Camera / Upload Box */}
      <div className="space-y-3">
        {image ? (
          <div className="relative rounded-3xl overflow-hidden border-2 border-[#2E6B34] aspect-video bg-black/5 flex items-center justify-center shadow-sm">
            <img src={image} alt="Sampah Terpindai" className="w-full h-full object-cover" />
            <button
              onClick={() => {
                setImage(null);
                setScanResult(null);
              }}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition"
              title="Foto Ulang"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div
            onClick={() => isGuest ? onRequireAuth() : fileInputRef.current?.click()}
            className="cursor-pointer border-2 border-dashed border-[#2E6B34]/40 hover:border-[#2E6B34] bg-white rounded-3xl p-8 text-center transition flex flex-col items-center justify-center gap-3 shadow-xs group"
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                isGuest ? onRequireAuth() : fileInputRef.current?.click();
              }
            }}
          >
            <div className="w-16 h-16 rounded-2xl bg-cyan-50 text-cyan-700 flex items-center justify-center group-hover:scale-105 transition shadow-xs">
              <Camera className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#1F2A1F]">
                Ambil Foto Sampah dengan Kamera
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Botol plastik, sisa makanan, baterai bekas, kardus, dll.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#2E6B34] text-white text-xs font-bold shadow-md">
              <Camera className="w-4 h-4" />
              <span>              {isGuest ? 'Masuk untuk memindai' : 'Buka Kamera / Galeri'}</span>
            </span>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleCapture}
          className="hidden"
        />
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 text-red-700 rounded-xl border border-red-200 text-xs">
          {errorMsg}
        </div>
      )}

      {/* Scanning State */}
      {scanning && (
        <div className="p-5 bg-white rounded-3xl border border-[#2E6B34]/30 text-center space-y-2 animate-pulse shadow-xs">
          <div className="w-12 h-12 rounded-full bg-cyan-50 text-cyan-700 mx-auto flex items-center justify-center">
            <Sparkles className="w-6 h-6 animate-spin" />
          </div>
          <h4 className="text-sm font-bold text-[#2E6B34] font-poppins">
            AI sedang mengenali kategori sampah...
          </h4>
          <p className="text-xs text-gray-500">
            Mengidentifikasi material dan mencari petunjuk daur ulang Danau Toba
          </p>
        </div>
      )}

      {/* Scan Results */}
      {scanResult && !scanning && (
        <div className="space-y-3 animate-in fade-in duration-300">
          {/* Main Category Badge */}
          <div className={`p-4 rounded-3xl border ${getCategoryColor(scanResult.category)} shadow-xs`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase font-extrabold tracking-widest opacity-80">
                Kategori Terdeteksi
              </span>
              <span className="text-xs font-bold">
                Keyakinan {scanResult.confidence}%
              </span>
            </div>
            <h3 className="text-lg font-extrabold font-poppins capitalize">
              {scanResult.category}: {scanResult.item_name}
            </h3>
          </div>

          {/* How to Sort */}
          <div className="bg-white p-4 rounded-3xl border border-gray-200 text-xs space-y-1.5 shadow-xs">
            <span className="font-bold text-[#1F2A1F] text-sm flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#2E6B34]" />
              Cara Memilah yang Benar:
            </span>
            <p className="text-gray-700 leading-relaxed pl-5">
              {scanResult.how_to_sort}
            </p>
          </div>

          {/* How to Recycle */}
          <div className="bg-white p-4 rounded-3xl border border-gray-200 text-xs space-y-1.5 shadow-xs">
            <span className="font-bold text-[#1F2A1F] text-sm flex items-center gap-1.5">
              <Trash2 className="w-4 h-4 text-cyan-700" />
              Rekomendasi Daur Ulang:
            </span>
            <p className="text-gray-700 leading-relaxed pl-5">
              {scanResult.how_to_recycle}
            </p>
          </div>

          {/* Eco Tip */}
          <div className="bg-[#A8D5A2]/20 p-4 rounded-3xl border border-[#2E6B34]/20 text-xs text-gray-800 space-y-1">
            <span className="font-bold text-[#2E6B34] block">
              Dampak Terhadap Danau Toba &amp; Ekologi:
            </span>
            <p className="leading-relaxed">{scanResult.eco_impact_tip}</p>
          </div>

          {/* Nearest Facility & Shortcut to Map */}
          <div className="bg-white p-4 rounded-3xl border border-[#2E6B34]/30 space-y-2.5 shadow-xs">
            <div className="flex items-start gap-2.5">
              <MapPin className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-[#1F2A1F] block">
                  Fasilitas Terdekat yang Disarankan:
                </span>
                <p className="text-xs text-gray-700 mt-0.5">
                  {scanResult.nearest_facility_suggestion}
                </p>
              </div>
            </div>

            <button
              onClick={onOpenMap}
              className="w-full touch-target py-2.5 rounded-xl bg-[#2E6B34] text-white text-xs font-bold hover:bg-[#235328] transition active:scale-95 flex items-center justify-center gap-1.5 shadow-md"
            >
              <span>Buka Peta Bank Sampah Tarutung</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Sorting Guidelines Guide */}
      {!scanResult && (
        <div className="p-4 bg-white rounded-3xl border border-gray-200 space-y-2 text-xs text-gray-600 shadow-xs">
          <span className="font-bold text-gray-900 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-[#2E6B34]" />
            Kategori Sampah yang Didukung:
          </span>
          <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
            <div className="p-2 bg-emerald-50/60 rounded-xl">
              <strong>1. Organik:</strong> Sisa sayur, daun, makanan untuk pupuk kompos.
            </div>
            <div className="p-2 bg-cyan-50/60 rounded-xl">
              <strong>2. Plastik:</strong> Botol PET, ember pecah, kemasan bersih.
            </div>
            <div className="p-2 bg-amber-50/60 rounded-xl">
              <strong>3. Kertas:</strong> Kardus, buku tulis, kertas berkas.
            </div>
            <div className="p-2 bg-red-50/60 rounded-xl">
              <strong>4. B3:</strong> Baterai, obat kedaluwarsa, lampu neon.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
