import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Trees,
  MapPin,
  Users,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
  Leaf,
  Volume2,
} from 'lucide-react';
import { BatakUlosRibbon } from './BatakPattern';

interface WelcomeTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
}

export const WelcomeTourModal: React.FC<WelcomeTourModalProps> = ({
  isOpen,
  onClose,
  userName = 'Sahabat Hijau',
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: 'Horas! Selamat Datang Dongaan Marsiadapari Hijau',
      subtitle: 'Gerakan Ekoteologi & Gotong Royong Danau Toba',
      badge: 'Selamat Datang',
      mascotExpression: 'wave',
      description: `Horas ${userName}! Marsiadapari Hijau adalah wadah persekutuan jemaat, mahasiswa, dan pemuda Batak untuk merawat bumi ciptaan Tuhan di bumi pertiwi Tapanuli & Danau Toba.`,
      highlight: '“Tuhanlah yang empunya bumi serta segala isinya.” · Mazmur 24:1',
      actionText: 'Lihat Fitur Unggulan',
      icon: Leaf,
      accentColor: '#2E6B34',
    },
    {
      title: 'Renungan Ciptaan Harian',
      subtitle: 'Firman Tuhan & Kearifan Budaya Batak',
      badge: 'Spiritualitas Hijau',
      mascotExpression: 'read',
      description: 'Dapatkan refleksi ekoteologis harian yang mengaitkan teks Alkitab dengan falsafah Batak Toba (seperti Marsiadapari dan filosofi tenun Ulos). Tumbuhkan iman yang peduli pada alam.',
      highlight: 'Dilengkapi renungan audio ambient deburan Danau Toba yang tenang.',
      actionText: 'Jelajahi Aksi Nyata',
      icon: BookOpen,
      accentColor: '#B45309',
    },
    {
      title: 'Tantangan Aksi Marsiadapari',
      subtitle: 'Aksi Kecil, Dampak Agung Bagi Bumi',
      badge: 'Gamifikasi & Aksi',
      mascotExpression: 'plant',
      description: 'Selesaikan aksi sederhana: tolak plastik, bawa tumbler di kampus/onan, tanam pohon buah, dan hemat air. Unggah foto bukti untuk meraih Poin Hijau dan lencana kehormatan!',
      highlight: 'Poin Anda menumbuhkan Kebun Virtual dan dicatat dalam Hutan Komunitas.',
      actionText: 'Lihat Peta Lokasi',
      icon: Trees,
      accentColor: '#15803D',
    },
    {
      title: 'Peta Bank Sampah & Reboisasi',
      subtitle: 'Titik Interaktif di Sekeliling Danau Toba',
      badge: 'Peta Komunitas',
      mascotExpression: 'explore',
      description: 'Temukan lokasi bank sampah terdekat untuk menukar sampah daur ulang, titik penghijauan lereng Dolok Martimbang, dan konservasi mata air alami di Tapanuli Utara.',
      highlight: 'Navigasi langsung ke lokasi melalui Google Maps atau usulkan titik baru.',
      actionText: 'Kekuatan Komunitas',
      icon: MapPin,
      accentColor: '#0284C7',
    },
    {
      title: 'Komunitas & Kalender Aksi',
      subtitle: 'Bergotong Royong Bersama Sesama',
      badge: 'Persekutuan',
      mascotExpression: 'celebrate',
      description: 'Daftar dan ikuti jadwal Ibadah Hijau serta aksi gotong royong akbar melalui Kalender Kegiatan. Bersama jemaat gereja dan kampus, kita jaga kelestarian Danau Toba.',
      highlight: 'Siap memulai langkah pertama Anda dalam merawat ciptaan Tuhan?',
      actionText: 'Mulai Sekarang!',
      icon: Users,
      accentColor: '#2E6B34',
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('mh_welcome_tour_seen', 'true');
    onClose();
  };

  if (!isOpen) return null;

  const current = steps[currentStep];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="relative w-full max-w-lg rounded-3xl bg-[#FAF6EC] dark:bg-[#121C14] text-[#1F2A1F] dark:text-[#E8EFE8] border border-[#2E6B34]/30 dark:border-white/10 shadow-2xl overflow-hidden"
          role="dialog"
          aria-modal="true"
        >
          {/* Authentic Batak Ulos Header Trim */}
          <div className="w-full">
            <BatakUlosRibbon heightClass="h-2" className="opacity-90" />
          </div>

          {/* Close button */}
          <button
            onClick={handleComplete}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/80 dark:bg-black/40 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white shadow-xs transition"
            aria-label="Tutup panduan"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="p-6 sm:p-7 space-y-5">
            {/* Mascot Container with Lively Expressions */}
            <div className="flex flex-col items-center justify-center pt-2">
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center">
                {/* Glowing backdrop */}
                <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl animate-pulse" />

                {/* Animated SVG Mascot: "Si Toba" (Sprout with Batak Ulos Headband) */}
                <motion.svg
                  key={current.mascotExpression}
                  initial={{ scale: 0.85, rotate: -5 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                  className="w-28 h-28 sm:w-32 sm:h-32 drop-shadow-lg"
                  viewBox="0 0 120 120"
                  fill="none"
                >
                  {/* Sprout Body */}
                  <path
                    d="M60 25 C35 25, 25 55, 25 80 C25 100, 40 110, 60 110 C80 110, 95 100, 95 80 C95 55, 85 25, 60 25 Z"
                    fill="url(#mascotGradient)"
                  />

                  {/* Cute Belly patch */}
                  <ellipse cx="60" cy="85" rx="22" ry="18" fill="#C5E8BF" opacity="0.8" />

                  {/* Batak Ulos Headband (Tali-tali) */}
                  <path
                    d="M30 52 C45 48, 75 48, 90 52 L91 58 C75 54, 45 54, 29 58 Z"
                    fill="#B91C1C"
                  />
                  {/* Ulos Geometric Motifs on Headband */}
                  <line x1="38" y1="53" x2="42" y2="57" stroke="#FBBF24" strokeWidth="1.5" />
                  <line x1="50" y1="52" x2="54" y2="56" stroke="#FBBF24" strokeWidth="1.5" />
                  <line x1="66" y1="52" x2="70" y2="56" stroke="#FBBF24" strokeWidth="1.5" />
                  <line x1="78" y1="53" x2="82" y2="57" stroke="#FBBF24" strokeWidth="1.5" />
                  <circle cx="60" cy="54" r="2.5" fill="#F59E0B" />

                  {/* Leaf Sprig on Top of Head */}
                  <path
                    d="M60 26 C60 12, 45 6, 40 10 C35 14, 44 24, 60 26 Z"
                    fill="#34D399"
                  />
                  <path
                    d="M60 26 C60 10, 75 4, 80 8 C85 12, 76 24, 60 26 Z"
                    fill="#10B981"
                  />

                  {/* Eyes according to Expression */}
                  {current.mascotExpression === 'wave' || current.mascotExpression === 'celebrate' ? (
                    <>
                      {/* Happy curved eyes */}
                      <path d="M44 68 C47 64, 53 64, 56 68" stroke="#16381D" strokeWidth="3" strokeLinecap="round" fill="none" />
                      <path d="M64 68 C67 64, 73 64, 76 68" stroke="#16381D" strokeWidth="3" strokeLinecap="round" fill="none" />
                    </>
                  ) : (
                    <>
                      {/* Big sparkly eyes */}
                      <ellipse cx="50" cy="67" rx="4.5" ry="5.5" fill="#14341B" />
                      <circle cx="48.5" cy="65" r="1.8" fill="white" />
                      <ellipse cx="70" cy="67" rx="4.5" ry="5.5" fill="#14341B" />
                      <circle cx="68.5" cy="65" r="1.8" fill="white" />
                    </>
                  )}

                  {/* Rosy Cheeks */}
                  <ellipse cx="38" cy="74" rx="4" ry="2.5" fill="#F87171" opacity="0.6" />
                  <ellipse cx="82" cy="74" rx="4" ry="2.5" fill="#F87171" opacity="0.6" />

                  {/* Smile / Mouth */}
                  <path
                    d="M53 74 Q60 81 67 74"
                    stroke="#14341B"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    fill="none"
                  />

                  {/* Animated Hands */}
                  {current.mascotExpression === 'wave' && (
                    <motion.path
                      d="M90 75 Q108 55 102 46 Q96 42 90 62"
                      fill="#2E6B34"
                      animate={{ rotate: [0, 12, -8, 12, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      style={{ originX: '90px', originY: '75px' }}
                    />
                  )}
                  {current.mascotExpression === 'plant' && (
                    <g>
                      <circle cx="60" cy="98" r="7" fill="#854D0E" />
                      <path d="M60 98 L60 88" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" />
                      <circle cx="60" cy="87" r="3" fill="#4ADE80" />
                    </g>
                  )}

                  {/* Gradients */}
                  <defs>
                    <linearGradient id="mascotGradient" x1="25" y1="25" x2="95" y2="110" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#4ADE80" />
                      <stop offset="0.6" stopColor="#22C55E" />
                      <stop offset="1" stopColor="#15803D" />
                    </linearGradient>
                  </defs>
                </motion.svg>
              </div>

              {/* Step Badge */}
              <span className="mt-2 text-[10px] font-extrabold uppercase tracking-widest px-3 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300/50">
                {current.badge}
              </span>
            </div>

            {/* Content Slide */}
            <div className="text-center space-y-2">
              <h3 className="text-lg sm:text-xl font-bold font-poppins text-[#1F2A1F] dark:text-[#E8EFE8] leading-tight">
                {current.title}
              </h3>
              <p className="text-xs font-semibold text-[#2E6B34] dark:text-emerald-400">
                {current.subtitle}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed max-w-md mx-auto pt-1">
                {current.description}
              </p>

              {/* Highlight Box */}
              <div className="mt-3 p-3 rounded-2xl bg-white/80 dark:bg-[#17271B] border border-gray-200/80 dark:border-white/10 text-xs italic font-medium text-emerald-900 dark:text-emerald-200">
                💡 {current.highlight}
              </div>
            </div>

            {/* Progress Dots */}
            <div className="flex items-center justify-center gap-1.5 pt-2">
              {steps.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    idx === currentStep
                      ? 'w-6 bg-[#2E6B34] dark:bg-emerald-400'
                      : 'w-2 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400'
                  }`}
                  aria-label={`Buka slide ${idx + 1}`}
                />
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1 border-t border-gray-200/80 dark:border-white/10">
              {currentStep > 0 ? (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-white/15 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Kembali</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleComplete}
                  className="px-3.5 py-2.5 text-xs font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Lewati
                </button>
              )}

              <button
                type="button"
                onClick={handleNext}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#2E6B34] hover:bg-[#235328] dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md active:scale-98 cursor-pointer"
              >
                <span>{currentStep === steps.length - 1 ? 'Mulai Aksi Sekarang!' : current.actionText}</span>
                {currentStep === steps.length - 1 ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
