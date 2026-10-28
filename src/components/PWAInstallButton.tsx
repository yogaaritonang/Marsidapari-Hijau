import React, { useState } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from './usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="touch-target inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2E6B34] text-white text-xs font-semibold shadow hover:bg-[#235328] transition active:scale-95"
        title="Pasang aplikasi di layar utama HP"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Pasang App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="touch-target inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FAF6EC] border border-[#2E6B34]/30 text-[#2E6B34] text-xs font-semibold shadow-xs hover:bg-[#A8D5A2]/20 transition"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Pasang iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[#FAF6EC] border border-[#2E6B34]/20 p-5 shadow-2xl text-[#1F2A1F]">
              <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                <h3 className="text-base font-bold text-[#2E6B34] flex items-center gap-2">
                  <Smartphone className="w-5 h-5" />
                  Pasang di iPhone / iPad
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-3 space-y-2.5 text-sm text-gray-700">
                <p>
                  1. Ketuk ikon <strong>Bagikan (Share)</strong> di bilah bawah Safari.
                </p>
                <p>
                  2. Gulir ke bawah lalu pilih <strong>Tambah ke Layar Utama (Add to Home Screen)</strong>.
                </p>
                <p>
                  3. Buka Marsiadapari Hijau langsung dari beranda seperti aplikasi native.
                </p>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-xl bg-[#2E6B34] py-2.5 text-sm font-semibold text-white hover:bg-[#235328] transition"
              >
                Mengerti
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
