import React, { useState, useEffect } from 'react';
import { Leaf, Award, Sun, Moon, CloudSun, Sunrise, Bell } from 'lucide-react';
import { User, BrandSettings, AppNotification } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { StorageService } from '../services/storageService';
import { ShareAchievementModal } from './ShareAchievementModal';
import { NotificationsModal } from './NotificationsModal';
import { SocialSyncService } from '../services/socialSyncService';
import { getRankTitle } from '../services/shareService';
import { BatakUlosRibbon } from './BatakPattern';

interface NavbarProps {
  user: User;
  isGuest: boolean;
  onNavigateTab: (tab: string) => void;
  onOpenAuth: (mode: 'register' | 'login') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, isGuest, onNavigateTab, onOpenAuth }) => {
  const [brand, setBrand] = useState<BrandSettings>(() => StorageService.getBrandSettings());
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>(() => SocialSyncService.getLocalNotifications());
  const [greeting, setGreeting] = useState({ text: 'Selamat Datang', icon: 'sun' });

  useEffect(() => {
    // Initial pull and periodic refresh
    void SocialSyncService.pullSocialData(user);

    const handleNotifUpdate = (e: Event) => {
      const detail = (e as CustomEvent<AppNotification[]>).detail;
      if (Array.isArray(detail)) setNotifications(detail);
      else setNotifications(SocialSyncService.getLocalNotifications());
    };

    window.addEventListener('mh-notifications-updated', handleNotifUpdate);
    const interval = setInterval(() => {
      void SocialSyncService.pullSocialData(user);
    }, 15000);

    return () => {
      window.removeEventListener('mh-notifications-updated', handleNotifUpdate);
      clearInterval(interval);
    };
  }, [user.id]);

  useEffect(() => {
    const handleBrandChange = (e?: Event) => {
      const detail = (e as CustomEvent<BrandSettings>)?.detail;
      if (detail && typeof detail === 'object' && Object.keys(detail).length > 0) {
        setBrand(detail);
      } else {
        setBrand(StorageService.getBrandSettings());
      }
    };
    window.addEventListener('mh-brand-updated', handleBrandChange);
    window.addEventListener('storage', handleBrandChange);
    return () => {
      window.removeEventListener('mh-brand-updated', handleBrandChange);
      window.removeEventListener('storage', handleBrandChange);
    };
  }, []);

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      if (hour >= 4 && hour < 11) {
        setGreeting({ text: 'Selamat Pagi', icon: 'morning' });
      } else if (hour >= 11 && hour < 15) {
        setGreeting({ text: 'Selamat Siang', icon: 'noon' });
      } else if (hour >= 15 && hour < 18) {
        setGreeting({ text: 'Selamat Sore', icon: 'afternoon' });
      } else {
        setGreeting({ text: 'Selamat Malam', icon: 'night' });
      }
    };

    updateGreeting();
    const interval = setInterval(updateGreeting, 60000);
    return () => clearInterval(interval);
  }, []);

  // Smooth Scroll Animation: Collapse brand text into logo, enlarge logo, and hide navbar on downscroll
  const [isScrolledDown, setIsScrolledDown] = useState(false);
  const [isNavbarHidden, setIsNavbarHidden] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY || 0;
    const handleScroll = () => {
      const currentY = window.scrollY || 0;

      // Text collapses into logo when scrolled past 25px
      setIsScrolledDown(currentY > 25);

      // Hide navbar when scrolling down past 90px; reappear smoothly when scrolling up
      if (currentY > 90 && currentY > lastY + 6) {
        setIsNavbarHidden(true);
      } else if (currentY < lastY - 4 || currentY <= 25) {
        setIsNavbarHidden(false);
      }
      lastY = currentY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const firstName = user.name && user.name !== 'Sahabat Hijau' ? user.name.split(' ')[0] : 'Sahabat';
  const rank = getRankTitle(user.points);
  const impact = StorageService.getUserImpact(user);

  return (
    <>
      <header
        className={`sticky top-0 z-40 bg-[#FAF6EC]/92 dark:bg-[#0F1710]/95 backdrop-blur-xl border-b border-[#2E6B34]/15 dark:border-white/10 shadow-xs transition-all duration-400 ease-in-out ${
          isNavbarHidden ? '-translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
        }`}
      >
        <div className="flex items-center justify-between gap-2 px-3 py-2.5 sm:px-5 lg:px-8">
          {/* Logo, Dynamic Brand & Greeting with Smooth Folding Transition */}
          <div
            onClick={() => onNavigateTab('home')}
            className="flex min-w-0 items-center gap-2.5 cursor-pointer select-none group"
            role="button"
            tabIndex={0}
            aria-label="Kembali ke beranda"
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') onNavigateTab('home');
            }}
          >
            {/* Logo image: scales up slightly when scrolled down */}
            {brand.logoUrl && brand.logoUrl.trim() ? (
              <div
                className={`relative h-10 w-10 flex items-center justify-center shrink-0 transition-all duration-300 ease-out ${
                  isScrolledDown ? 'scale-115 drop-shadow-md' : 'group-hover:scale-105'
                }`}
              >
                <img
                  src={brand.logoUrl}
                  alt={brand.name || 'Logo'}
                  className="max-h-10 max-w-10 object-contain drop-shadow-sm"
                />
                {/* Subtle active status dot */}
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              </div>
            ) : (
              <div
                className={`relative w-10 h-10 rounded-2xl bg-gradient-to-br from-[#2E6B34] via-[#24592A] to-[#173F1C] flex items-center justify-center text-white shadow-md shadow-[#2E6B34]/25 transition-all duration-300 ease-out shrink-0 ${
                  isScrolledDown ? 'scale-115' : 'group-hover:scale-105'
                }`}
              >
                <Leaf className="w-5 h-5 text-[#A8D5A2]" />
                {/* Subtle active status dot */}
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border-2 border-[#FAF6EC] dark:border-[#0F1710]"></span>
                </span>
              </div>
            )}

            {/* Brand text & Greeting: smoothly folds and collapses into the logo */}
            <div
              className={`min-w-0 transition-all duration-400 ease-out origin-left ${
                isScrolledDown
                  ? 'max-w-0 opacity-0 -translate-x-3 scale-90 overflow-hidden pointer-events-none mr-0'
                  : 'max-w-[240px] opacity-100 translate-x-0 scale-100'
              }`}
            >
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="font-bold text-sm tracking-tight text-[#1F2A1F] dark:text-[#E6EFE6] font-poppins sm:text-base truncate group-hover:text-[#2E6B34] dark:group-hover:text-emerald-400 transition-colors">
                  {brand.name || 'Marsiadapari Hijau'}
                </span>
                {!isGuest && (
                  <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-bold text-[#2E6B34] dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/70 border border-emerald-300/60 dark:border-emerald-700/60 px-2 py-0.5 rounded-full">
                    {rank}
                  </span>
                )}
              </div>
              
              {/* Dynamic time-aware subtitle */}
              <div className="flex items-center gap-1.5 text-[11px] font-medium leading-none text-[#7A5230] dark:text-emerald-300/80 mt-0.5 whitespace-nowrap">
                <span className="flex items-center gap-1">
                  {greeting.icon === 'morning' && <Sunrise className="w-3 h-3 text-amber-500" />}
                  {greeting.icon === 'noon' && <Sun className="w-3 h-3 text-amber-500" />}
                  {greeting.icon === 'afternoon' && <CloudSun className="w-3 h-3 text-orange-400" />}
                  {greeting.icon === 'night' && <Moon className="w-3 h-3 text-indigo-400" />}
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    {isGuest ? `${greeting.text}!` : `${greeting.text}, ${firstName}!`}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Right Action Cluster: Pasang App, Poin & Notifikasi */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {/* PWA Install Button: available on both mobile and desktop without shrinking any element */}
            <div className="shrink-0 flex items-center">
              <PWAInstallButton />
            </div>

            {isGuest ? (
              <button
                onClick={() => onOpenAuth('login')}
                className="rounded-xl bg-[#2E6B34] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#235328] active:scale-95 shrink-0"
              >
                Masuk
              </button>
            ) : (
              <>
                {/* Live Green Points Badge */}
                <button
                  type="button"
                  onClick={() => setIsShareOpen(true)}
                  className="flex items-center gap-1 sm:gap-1.5 rounded-full border border-[#2E6B34]/25 bg-gradient-to-r from-[#A8D5A2]/30 to-emerald-100/60 px-2 sm:px-2.5 py-1 transition hover:bg-[#A8D5A2]/45 active:scale-95 shadow-2xs shrink-0 cursor-pointer"
                  title="Klik untuk melihat pencapaian Poin Hijau Anda"
                >
                  <Award className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#2E6B34] shrink-0" />
                  <span className="text-[11px] sm:text-xs font-black text-[#1F2A1F] dark:text-white">{user.points}</span>
                  <span className="text-[9px] sm:text-[10px] font-bold text-[#2E6B34] dark:text-emerald-300 uppercase tracking-wide">Poin</span>
                </button>

                {/* Notification Bell with unread badge */}
                <button
                  type="button"
                  onClick={() => setIsNotifOpen(true)}
                  className="relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-[#2E6B34]/20 dark:border-white/10 bg-white/90 dark:bg-[#152317] hover:bg-white text-[#2E6B34] dark:text-emerald-400 shadow-2xs hover:shadow-xs transition active:scale-95 shrink-0 cursor-pointer"
                  title="Notifikasi Interaksi & Kegiatan Baru"
                >
                  <Bell className="h-4 w-4 text-[#2E6B34] dark:text-emerald-400" />
                  {notifications.filter((n) => (n.recipientUserId === user.id || n.recipientUserId === 'all') && !n.read).length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white shadow-xs animate-pulse">
                      {notifications.filter((n) => (n.recipientUserId === user.id || n.recipientUserId === 'all') && !n.read).length}
                    </span>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Elegant modern dynamic accent line */}
        <div className="relative h-[2px] w-full overflow-hidden bg-transparent">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#2E6B34]/40 via-emerald-500/50 to-transparent" />
        </div>
        {/* Authentic Batak Ulos Ribbon Border Accent with Community Tint & Hover */}
        <BatakUlosRibbon heightClass="h-1.5" className="opacity-95" tintColor={brand.primaryColor} interactive={true} />
      </header>

      {/* Share Achievement Modal */}
      <ShareAchievementModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        payload={{
          name: user.name,
          points: user.points,
          communityName: user.communityName,
          trees: impact.trees,
          wasteKg: impact.wasteKg,
          rankTitle: rank,
        }}
      />

      {/* Interactive Notifications Modal */}
      <NotificationsModal
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        notifications={notifications}
        userId={user.id}
      />
    </>
  );
};
