import React, { useState } from 'react';
import { Download, X, Smartphone, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from './usePWAInstall';

export const PWAInstallButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  // When app is installed, do not render anything to keep navbar pristine
  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`touch-target shrink-0 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-emerald-700/90 dark:bg-emerald-800/90 hover:bg-[#235328] text-white shadow-xs transition active:scale-95 cursor-pointer ${className}`}
        title="Pasang Aplikasi Marsiadapari Hijau"
        aria-label="Pasang Aplikasi"
      >
        <Download className="w-4 h-4 shrink-0" />
      </button>
    );
  }

  // Fallback icon button for iOS Safari or browsers without immediate prompt
  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuide(true)}
        className={`touch-target shrink-0 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-[#2E6B34]/25 dark:border-white/10 bg-white/90 dark:bg-[#152317] text-[#2E6B34] dark:text-emerald-400 hover:bg-[#A8D5A2]/20 dark:hover:bg-emerald-950/60 shadow-2xs transition active:scale-95 cursor-pointer ${className}`}
        title="Pasang Aplikasi di Layar Utama HP / Desktop"
        aria-label="Panduan Pasang Aplikasi"
      >
        <Smartphone className="w-4 h-4 shrink-0" />
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-[#FAF6EC] dark:bg-[#121B14] border border-[#2E6B34]/25 dark:border-white/10 p-5 shadow-2xl text-[#1F2A1F] dark:text-white space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-white/10">
              <h3 className="text-sm font-bold text-[#2E6B34] dark:text-emerald-400 flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                <span>Pasang Marsiadapari Hijau di HP</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
              {isIOS ? (
                <>
                  <p className="flex items-start gap-2">
                    <span className="font-bold text-[#2E6B34] dark:text-emerald-400 shrink-0">1.</span>
                    <span>Ketuk ikon <strong>Bagikan (Share)</strong> di bilah navigasi Safari.</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="font-bold text-[#2E6B34] dark:text-emerald-400 shrink-0">2.</span>
                    <span>Gulir ke bawah dan pilih <strong>Tambah ke Layar Utama (Add to Home Screen)</strong>.</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="font-bold text-[#2E6B34] dark:text-emerald-400 shrink-0">3.</span>
                    <span>Buka aplikasi langsung dari beranda HP tanpa perlu membuka browser lagi!</span>
                  </p>
                </>
              ) : (
                <>
                  <p className="flex items-start gap-2">
                    <span className="font-bold text-[#2E6B34] dark:text-emerald-400 shrink-0">1.</span>
                    <span>Ketuk menu titik tiga <strong>(⋮)</strong> di pojok kanan atas browser Chrome / Samsung Internet.</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="font-bold text-[#2E6B34] dark:text-emerald-400 shrink-0">2.</span>
                    <span>Pilih <strong>Pasang aplikasi (Install App)</strong> atau <strong>Tambahkan ke Layar Utama</strong>.</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="font-bold text-[#2E6B34] dark:text-emerald-400 shrink-0">3.</span>
                    <span>Ikon Marsiadapari Hijau akan muncul di layar utama HP Anda dengan akses offline cepat.</span>
                  </p>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-3 w-full rounded-xl bg-[#2E6B34] hover:bg-[#235328] py-2 text-xs font-bold text-white transition cursor-pointer"
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
};
