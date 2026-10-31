import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Leaf, Sparkles, BookOpen, ChevronRight } from 'lucide-react';
import { BrandSettings } from '../types';
import { StorageService } from '../services/storageService';
import { BatakGorgaBorder } from './BatakPattern';

interface LaunchScreenProps {
  forceShow?: boolean;
  onFinish?: () => void;
}

export const LaunchScreen: React.FC<LaunchScreenProps> = ({ forceShow = false, onFinish }) => {
  const [isVisible, setIsVisible] = useState(() => {
    if (forceShow) return true;
    const brand = StorageService.getBrandSettings();
    if (brand.launchScreen && brand.launchScreen.enabled === false) {
      return false;
    }
    // Check session storage so regular navigation doesn't replay launch screen constantly,
    // but full refresh or new tab will show it.
    const hasShownInSession = sessionStorage.getItem('mh_launch_screen_shown');
    return !hasShownInSession;
  });

  const [brand, setBrand] = useState<BrandSettings>(() => StorageService.getBrandSettings());

  useEffect(() => {
    const handleBrandUpdate = () => {
      setBrand(StorageService.getBrandSettings());
    };
    const handlePreview = (e: Event) => {
      const customBrand = (e as CustomEvent<BrandSettings>)?.detail;
      if (customBrand) setBrand(customBrand);
      setIsVisible(true);
    };

    window.addEventListener('mh-brand-updated', handleBrandUpdate);
    window.addEventListener('mh-preview-launch-screen', handlePreview);
    return () => {
      window.removeEventListener('mh-brand-updated', handleBrandUpdate);
      window.removeEventListener('mh-preview-launch-screen', handlePreview);
    };
  }, []);

  const launchConfig = brand.launchScreen || {
    enabled: true,
    title: brand.name || 'Marsiadapari Hijau',
    subtitle: brand.tagline || 'Gerakan Ekoteologi & Keberlanjutan Alam Toba',
    verseText: 'TUHAN Allah mengambil manusia itu dan menempatkannya dalam taman Eden untuk mengusahakan dan memelihara taman itu.',
    verseRef: 'Kejadian 2:15',
    logoUrl: brand.logoUrl || '',
    bgGradient: 'from-emerald-950 via-[#1B3F23] to-[#0D2413]',
    durationMs: 2600,
  };

  useEffect(() => {
    if (!isVisible) return;

    sessionStorage.setItem('mh_launch_screen_shown', 'true');
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onFinish) onFinish();
    }, launchConfig.durationMs || 2600);

    return () => clearTimeout(timer);
  }, [isVisible, launchConfig.durationMs, onFinish]);

  const handleDismiss = () => {
    setIsVisible(false);
    if (onFinish) onFinish();
  };

  const logoSrc = launchConfig.logoUrl || brand.logoUrl;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="launch-screen-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.03 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          onClick={handleDismiss}
          className="fixed inset-0 z-[100] flex flex-col justify-between overflow-hidden bg-gradient-to-b from-[#0F2A15] via-[#173F1F] to-[#0A1D0E] text-white cursor-pointer select-none"
        >
          {/* Subtle Batak Gorga Top Border */}
          <div className="w-full opacity-35">
            <BatakGorgaBorder height={8} />
          </div>

          {/* Ambient Glowing Orbs */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-[#A8D5A2]/10 blur-3xl pointer-events-none" />

          {/* Center Identity Section */}
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">
            {/* Animated Logo Container */}
            <motion.div
              initial={{ scale: 0.75, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 0.6, type: 'spring', damping: 18 }}
              className="relative mb-6"
            >
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-emerald-600 via-[#2E6B34] to-[#14421A] p-1.5 shadow-2xl shadow-emerald-950/80 border-2 border-emerald-400/30 flex items-center justify-center">
                {logoSrc && logoSrc.trim() ? (
                  <img
                    src={logoSrc}
                    alt={launchConfig.title}
                    className="w-full h-full object-contain rounded-2xl"
                  />
                ) : (
                  <div className="w-full h-full rounded-2xl bg-emerald-900/40 flex items-center justify-center">
                    <Leaf className="w-12 h-12 text-[#A8D5A2] drop-shadow-md" />
                  </div>
                )}
              </div>

              {/* Pulsing halo */}
              <span className="absolute -inset-2 rounded-3xl bg-emerald-500/20 blur-md -z-10 animate-pulse" />
            </motion.div>

            {/* Title & Subtitle */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="space-y-2 max-w-md"
            >
              <h1 className="text-2xl sm:text-3xl font-extrabold font-poppins tracking-tight text-[#FAF6EC] drop-shadow-sm">
                {launchConfig.title || 'Marsiadapari Hijau'}
              </h1>
              <p className="text-xs sm:text-sm font-medium text-[#A8D5A2] tracking-wide">
                {launchConfig.subtitle || 'Gerakan Ekoteologi & Keberlanjutan Alam Toba'}
              </p>
            </motion.div>

            {/* Scripture Verse Quote */}
            {launchConfig.verseText && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="mt-8 max-w-sm sm:max-w-md mx-auto rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 p-4 text-left shadow-lg"
              >
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300 uppercase tracking-wider mb-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-amber-300" />
                  <span>Firman Pembuka</span>
                </div>
                <p className="text-xs sm:text-[13px] leading-relaxed text-[#FAF6EC] italic font-serif">
                  "{launchConfig.verseText}"
                </p>
                {launchConfig.verseRef && (
                  <p className="text-right text-[11px] font-bold text-[#A8D5A2] mt-2">
                    — {launchConfig.verseRef}
                  </p>
                )}
              </motion.div>
            )}
          </div>

          {/* Footer Bar: Quick Dismiss Prompt & Bottom Gorga */}
          <div className="relative z-10 pb-6 px-6 text-center">
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.85 }}
              transition={{ delay: 0.7 }}
              onClick={handleDismiss}
              className="inline-flex items-center gap-1.5 text-xs text-[#FAF6EC]/80 hover:text-white transition font-medium bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/10"
            >
              <span>Ketuk di mana saja untuk melanjutkan</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </motion.button>

            <div className="mt-4 w-full opacity-35">
              <BatakGorgaBorder height={8} />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
