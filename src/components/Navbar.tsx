import React from 'react';
import { Leaf, Award, ShieldCheck, User as UserIcon } from 'lucide-react';
import { User } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { BatakGorgaBorder } from './BatakPattern';
import { StorageService } from '../services/storageService';
import { ProfileAvatar } from './ProfileAvatar';

interface NavbarProps {
  user: User;
  isGuest: boolean;
  onNavigateTab: (tab: string) => void;
  onOpenAuth: (mode: 'register' | 'login') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, isGuest, onNavigateTab, onOpenAuth }) => {
  const brand = StorageService.getBrandSettings();
  return (
    <header className="sticky top-0 z-40 bg-[#FAF6EC]/95 backdrop-blur-md border-b border-[#2E6B34]/15 shadow-xs">
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 sm:px-5 lg:px-8">
        {/* Logo and Brand */}
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
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2E6B34] to-[#1F4B23] flex items-center justify-center text-white shadow-md shadow-[#2E6B34]/20 group-hover:scale-105 transition">
            {brand.logoUrl ? (
              <img src={brand.logoUrl} alt="" className="h-full w-full rounded-xl object-contain" />
            ) : (
              <Leaf className="w-5 h-5 text-[#A8D5A2]" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight text-[#1F2A1F] font-poppins sm:text-base">
                {brand.name || 'Marsiadapari Hijau'}
              </span>
            </div>
            <p className="mt-0.5 hidden text-[11px] font-medium leading-none text-[#7A5230] sm:block">
              IAKN Tarutung &bull; Danau Toba
            </p>
          </div>
        </div>

        {/* Right Action Cluster */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <PWAInstallButton />

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
              <button
                onClick={() => onNavigateTab('impact')}
                className="touch-target flex items-center gap-1.5 rounded-full border border-[#2E6B34]/20 bg-[#A8D5A2]/30 px-2.5 py-1 transition hover:bg-[#A8D5A2]/45 active:scale-95"
                title="Lihat Capaian Dampak Anda"
              >
                <Award className="h-4 w-4 text-[#2E6B34]" />
                <span className="text-xs font-bold text-[#1F2A1F]">{user.points}</span>
                <span className="text-[10px] font-semibold text-[#7A5230]">Poin</span>
              </button>
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

      {/* Subtle Batak Gorga Divider below header */}
      <BatakGorgaBorder className="py-0 opacity-60" />
    </header>
  );
};
