import React from 'react';

export const BatakGorgaBorder: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`w-full overflow-hidden flex items-center justify-center py-1 opacity-75 ${className}`}>
      <svg className="w-full h-3.5" preserveAspectRatio="none" viewBox="0 0 400 14" fill="none">
        <path
          d="M0 7 C 25 0, 50 14, 75 7 C 100 0, 125 14, 150 7 C 175 0, 200 14, 225 7 C 250 0, 275 14, 300 7 C 325 0, 350 14, 375 7 L 400 7"
          stroke="#2E6B34"
          strokeWidth="2.5"
          fill="none"
        />
        <path
          d="M0 7 C 25 14, 50 0, 75 7 C 100 14, 125 0, 150 7 C 175 14, 200 0, 225 7 C 250 14, 275 0, 300 7 C 325 14, 350 0, 375 7 L 400 7"
          stroke="#7A5230"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          fill="none"
        />
        <circle cx="75" cy="7" r="2.5" fill="#A8D5A2" />
        <circle cx="150" cy="7" r="2.5" fill="#A8D5A2" />
        <circle cx="225" cy="7" r="2.5" fill="#A8D5A2" />
        <circle cx="300" cy="7" r="2.5" fill="#A8D5A2" />
        <circle cx="375" cy="7" r="2.5" fill="#A8D5A2" />
      </svg>
    </div>
  );
};

export const BatakCornerMotif: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <svg className={`w-10 h-10 text-[#2E6B34]/15 ${className}`} viewBox="0 0 50 50" fill="currentColor">
      <path d="M0 0 L50 0 C40 10, 30 25, 25 50 C20 30, 10 20, 0 0 Z" />
      <circle cx="15" cy="15" r="4" fill="#A8D5A2" opacity="0.4" />
    </svg>
  );
};

/**
 * Pita Tenun Ulos Batak Tradisional
 * Menampilkan motif tenun ulos autentik tanpa background foto,
 * dengan dukungan warna tema komunitas (tintColor) dan efek hover interaktif.
 */
export const BatakUlosRibbon: React.FC<{
  className?: string;
  heightClass?: string;
  rounded?: boolean;
  tintColor?: string;
  interactive?: boolean;
}> = ({ className = '', heightClass = 'h-1.5', rounded = false, tintColor, interactive = false }) => {
  return (
    <div
      className={`w-full overflow-hidden ${heightClass} ${rounded ? 'rounded-full' : ''} shadow-2xs relative ${
        interactive ? 'transition-all duration-300 hover:scale-[1.01] hover:opacity-100' : ''
      } ${className}`}
      role="presentation"
      aria-hidden="true"
    >
      <div
        className="w-full h-full bg-repeat-x bg-cover"
        style={{
          backgroundImage: "url('/assets/ulos-ribbon.jpg')",
          backgroundPosition: 'center',
          backgroundSize: 'auto 100%',
        }}
      />
      {tintColor && (
        <div
          className="absolute inset-0 pointer-events-none opacity-25 mix-blend-color"
          style={{ backgroundColor: tintColor }}
        />
      )}
    </div>
  );
};

/**
 * Badge motif tenun ulos kecil untuk penanda kearifan lokal
 */
export const BatakUlosBadge: React.FC<{
  label?: string;
  className?: string;
}> = ({ label = 'Kearifan Batak Toba', className = '' }) => {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1A0B0B] text-[#FAF6EC] border border-amber-600/30 text-[10px] font-bold shadow-xs overflow-hidden ${className}`}>
      <span
        className="w-3.5 h-3.5 rounded-full overflow-hidden shrink-0 border border-amber-400/50 shadow-2xs"
        style={{
          backgroundImage: "url('/assets/ulos-ribbon.jpg')",
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        }}
        aria-hidden="true"
      />
      <span className="tracking-wide text-amber-200">{label}</span>
    </span>
  );
};

/**
 * Elemen dekorasi kain Ulos transparan di header dengan efek parallax lembut saat scroll
 * dan hover scale responsif yang elegan.
 */
export const BatakUlosHeaderParallax: React.FC<{
  scrollY?: number;
  tintColor?: string;
  className?: string;
}> = ({ scrollY = 0, tintColor, className = '' }) => {
  // Parallax subtle vertical offset
  const parallaxY = Math.min(24, Math.max(-12, scrollY * 0.08));

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl select-none group transition-all duration-300 ${className}`}
      style={{
        transform: `translateY(${parallaxY}px)`,
      }}
    >
      <div className="relative h-12 sm:h-14 w-full rounded-2xl overflow-hidden border border-amber-800/25 dark:border-amber-500/20 shadow-xs bg-[#1F1010]/30 backdrop-blur-xs transition-all duration-300 group-hover:scale-[1.015] group-hover:opacity-95 opacity-80">
        {/* Semi-transparent Ulos pattern background */}
        <div
          className="w-full h-full bg-cover bg-center transition-transform duration-500 group-hover:scale-105 opacity-70 dark:opacity-60"
          style={{
            backgroundImage: "url('/assets/ulos-ribbon.jpg')",
            backgroundPosition: 'center',
            backgroundSize: 'cover',
          }}
        />

        {/* Dynamic community/brand color tint */}
        {tintColor && (
          <div
            className="absolute inset-0 pointer-events-none opacity-30 mix-blend-color"
            style={{ backgroundColor: tintColor }}
          />
        )}

        {/* Soft edge masking and gradient overlay so text/content above/below stays pristine */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#FAF6EC]/90 via-transparent to-[#FAF6EC]/90 dark:from-[#0F1710]/90 dark:via-transparent dark:to-[#0F1710]/90 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-transparent pointer-events-none" />

        {/* Gentle Cultural Greeting Watermark */}
        <div className="absolute inset-0 flex items-center justify-between px-4 text-[10px] font-bold text-amber-900/80 dark:text-amber-200/80 pointer-events-none">
          <span className="flex items-center gap-1.5 uppercase tracking-widest text-[9px]">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Tenun Ulos Budaya Batak
          </span>
          <span className="italic font-serif text-[10px] tracking-wide opacity-80 hidden sm:inline">
            "Marsiadapari mamparbuehon denggan"
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * Elemen kain Ulos di bagian paling bawah halaman (Footer)
 * dengan rumbai-rumbai menghadap ke atas, efek hover scale & opacity, dan pewarnaan dinamis.
 */
export const BatakUlosFooter: React.FC<{
  tintColor?: string;
  className?: string;
}> = ({ tintColor, className = '' }) => {
  return (
    <footer className={`relative w-full overflow-hidden pt-8 pb-4 text-center group cursor-default select-none ${className}`}>
      <div className="mx-auto max-w-xl px-4">
        {/* Container with hover scale & opacity */}
        <div className="relative overflow-hidden rounded-t-3xl border-t-2 border-x border-amber-700/30 dark:border-amber-500/20 bg-gradient-to-b from-transparent via-[#1A0B0B]/40 to-[#1A0B0B]/90 shadow-xl transition-all duration-500 transform group-hover:scale-[1.02] group-hover:opacity-100 opacity-90">
          
          {/* Ulos image with fringes facing UPWARDS */}
          <div className="relative h-32 sm:h-40 w-full overflow-hidden">
            <img
              src="/assets/ulos-footer-rumbai-up.png"
              alt="Kain Tenun Ulos Batak dengan rumbai-rumbai menghadap ke atas"
              className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
            />

            {/* Dynamic Community / Brand Color Tint */}
            {tintColor && (
              <div
                className="absolute inset-0 pointer-events-none opacity-30 mix-blend-color"
                style={{ backgroundColor: tintColor }}
              />
            )}

            {/* Subtle Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#140808] via-transparent to-transparent pointer-events-none" />
          </div>

          {/* Cultural Footer Caption */}
          <div className="relative -mt-6 pb-3 px-3">
            <span className="inline-block text-[10px] sm:text-xs font-bold text-amber-200 bg-black/75 px-3 py-1 rounded-full backdrop-blur-xs border border-amber-500/40 shadow-md">
              Kain Ulos Batak Toba • Merawat Bumi Ciptaan Tuhan
            </span>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2 font-medium">
              "Si pogos so marripu, si mamora so marhaha maranggi" — Bersatu merawat Danau Toba
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};


