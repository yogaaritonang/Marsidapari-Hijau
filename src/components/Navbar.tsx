import React, { useState, useEffect } from 'react';
import { Leaf, Award, ShieldCheck, User as UserIcon, Share2, Sun, Moon, CloudSun, Sunrise, Bell } from 'lucide-react';
import { User, BrandSettings, AppNotification } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { StorageService } from '../services/storageService';
import { ProfileAvatar } from './ProfileAvatar';
import { ShareAchievementModal } from './ShareAchievementModal';
import { NotificationsModal } from './NotificationsModal';
import { SocialSyncService } from '../services/socialSyncService';
import { getRankTitle } from '../services/shareService';

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
    const handleBrandChange = () => {
      setBrand(StorageService.getBrandSettings());
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

  const firstName = user.name && user.name !== 'Sahabat Hijau' ? user.name.split(' ')[0] : 'Sahabat';
  const rank = getRankTitle(user.points);
  const impact = StorageService.getUserImpact(user);

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#FAF6EC]/92 backdrop-blur-xl border-b border-[#2E6B34]/15 shadow-xs transition-all">
        <div className="flex items-center justify-between gap-2 px-3 py-2.5 sm:px-5 lg:px-8">
          {/* Logo, Dynamic Brand & Greeting */}
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
            <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-[#2E6B34] via-[#24592A] to-[#173F1C] flex items-center justify-center text-white shadow-md shadow-[#2E6B34]/25 group-hover:scale-105 transition-transform duration-200">
              {brand.logoUrl ? (
                <img src={brand.logoUrl} alt="" className="h-full w-full rounded-2xl object-contain p-0.5" />
              ) : (
                <Leaf className="w-5 h-5 text-[#A8D5A2]" />
              )}
              {/* Subtle active status dot */}
              <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-[#FAF6EC]"></span>
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-[#1F2A1F] font-poppins sm:text-base truncate group-hover:text-[#2E6B34] transition-colors">
                  {brand.name || 'Marsiadapari Hijau'}
                </span>
                {!isGuest && (
                  <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-bold text-[#2E6B34] bg-emerald-100/70 border border-emerald-300/60 px-2 py-0.5 rounded-full">
                    {rank}
                  </span>
                )}
              </div>
              
              {/* Dynamic time-aware subtitle */}
              <div className="flex items-center gap-1.5 text-[11px] font-medium leading-none text-[#7A5230] mt-0.5">
                <span className="flex items-center gap-1">
                  {greeting.icon === 'morning' && <Sunrise className="w-3 h-3 text-amber-500" />}
                  {greeting.icon === 'noon' && <Sun className="w-3 h-3 text-amber-500" />}
                  {greeting.icon === 'afternoon' && <CloudSun className="w-3 h-3 text-orange-400" />}
                  {greeting.icon === 'night' && <Moon className="w-3 h-3 text-indigo-400" />}
                  <span className="font-semibold text-gray-700">
                    {isGuest ? `${greeting.text}!` : `${greeting.text}, ${firstName}!`}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Right Action Cluster */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <PWAInstallButton />

            {/* Quick Share Button for achievements */}
            {!isGuest && (
              <button
                type="button"
                onClick={() => setIsShareOpen(true)}
                className="flex items-center gap-1 rounded-xl border border-[#2E6B34]/20 bg-white/80 hover:bg-white px-2.5 py-1.5 text-xs font-bold text-[#2E6B34] shadow-2xs hover:shadow-xs transition active:scale-95"
                title="Bagikan Pencapaian Poin Hijau ke Teman"
              >
                <Share2 className="h-3.5 w-3.5 text-emerald-600" />
                <span className="hidden sm:inline text-[11px]">Ajak Teman</span>
              </button>
            )}

            {!isGuest && (
              /* Notification Bell with unread badge */
              <button
                type="button"
                onClick={() => setIsNotifOpen(true)}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[#2E6B34]/20 bg-white/80 hover:bg-white text-[#2E6B34] shadow-2xs hover:shadow-xs transition active:scale-95"
                title="Notifikasi Interaksi (Like, Komentar, Love Peringkat)"
              >
                <Bell className="h-4 w-4 text-[#2E6B34]" />
                {notifications.filter((n) => n.recipientUserId === user.id && !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white shadow-xs animate-pulse">
                    {notifications.filter((n) => n.recipientUserId === user.id && !n.read).length}
                  </span>
                )}
              </button>
            )}

            {isGuest ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onOpenAuth('login')}
                  className="min-h-10 rounded-xl px-2.5 text-xs font-bold text-[#2E6B34] transition hover:bg-[#A8D5A2]/25 sm:px-3 sm:text-sm"
                >
                  Masuk
                </button>
                <button
                  onClick={() => onOpenAuth('register')}
                  className="min-h-10 rounded-xl bg-[#2E6B34] px-3 text-xs font-bold text-white shadow-sm transition hover:bg-[#235328] sm:px-4 sm:text-sm"
                >
                  Daftar
                </button>
              </div>
            ) : (
              <>
                {/* Live Green Points Badge */}
                <button
                  onClick={() => setIsShareOpen(true)}
                  className="touch-target flex items-center gap-1.5 rounded-full border border-[#2E6B34]/25 bg-gradient-to-r from-[#A8D5A2]/30 to-emerald-100/60 px-2.5 py-1 transition hover:bg-[#A8D5A2]/45 active:scale-95 shadow-2xs"
                  title="Klik untuk melihat dan membagikan Poin Hijau Anda"
                >
                  <Award className="h-4 w-4 text-[#2E6B34]" />
                  <span className="text-xs font-black text-[#1F2A1F]">{user.points}</span>
                  <span className="text-[10px] font-bold text-[#2E6B34] uppercase tracking-wide">Poin</span>
                </button>

                {/* Profile Avatar Button */}
                <button
                  onClick={() => onNavigateTab('profile')}
                  className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[#2E6B34]/20 bg-white text-[#2E6B34] shadow-xs transition hover:bg-[#FAF6EC] active:scale-95"
                  title="Profil & Pengaturan"
                >
                  {user.id !== 'guest-preview' ? (
                    <ProfileAvatar
                      userId={user.id}
                      name={user.name}
                      className="h-full w-full rounded-full bg-white text-xs font-bold text-[#2E6B34]"
                    />
                  ) : user.role === 'pemimpin' ? (
                    <ShieldCheck className="h-5 w-5 text-[#2E6B34]" />
                  ) : (
                    <UserIcon className="h-5 w-5 text-[#2E6B34]" />
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Elegant modern dynamic accent line (replaces the old intertwined rope border) */}
        <div className="relative h-[2px] w-full overflow-hidden bg-transparent">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#2E6B34]/40 via-emerald-500/50 to-transparent" />
        </div>
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
