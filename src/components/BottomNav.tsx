import React from 'react';
import { Home, MessageSquare, Flame, Trees, Users, User as UserIcon } from 'lucide-react';
import { User } from '../types';
import { ProfileAvatar } from './ProfileAvatar';

export type NavTabId = 'home' | 'threads' | 'challenges' | 'garden' | 'community' | 'profile';

export interface BottomNavProps {
  currentTab: NavTabId;
  onChangeTab: (tab: NavTabId) => void;
  user?: User;
  isGuest?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onChangeTab, user, isGuest }) => {
  const tabs: Array<{ id: NavTabId; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'home', label: 'Beranda', icon: Home },
    { id: 'threads', label: 'Threads', icon: MessageSquare },
    { id: 'challenges', label: 'Aksi', icon: Flame },
    { id: 'garden', label: 'Taman', icon: Trees },
    { id: 'community', label: 'Komunitas', icon: Users },
    { id: 'profile', label: 'Profil', icon: UserIcon },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#2E6B34]/20 bg-[#FAF6EC]/95 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur-md md:bottom-4 md:left-1/2 md:right-auto md:w-[min(100%-2rem,760px)] md:-translate-x-1/2 md:rounded-full md:border md:shadow-[0_8px_32px_rgba(31,42,31,0.16)]">
      <div className="mx-auto flex max-w-[760px] items-center justify-around px-2 pb-[env(safe-area-inset-bottom)] md:pb-0 md:px-4">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          const Icon = tab.icon;
          const isProfileTab = tab.id === 'profile';
          const showUserAvatar = isProfileTab && !isGuest && user && user.id !== 'guest-preview';

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`touch-target relative flex flex-1 flex-col items-center justify-center rounded-xl px-0.5 py-1.5 transition-all duration-200 md:px-2 md:py-2.5 ${
                isActive
                  ? 'text-[#2E6B34] font-bold'
                  : 'text-gray-500 hover:text-[#2E6B34] font-medium'
              }`}
            >
              <div
                className={`w-8 h-7 sm:w-9 sm:h-7 flex items-center justify-center rounded-full transition-all duration-200 ${
                  isActive && !showUserAvatar ? 'bg-[#A8D5A2]/35 scale-110' : ''
                }`}
              >
                {showUserAvatar ? (
                  <div
                    className={`relative flex items-center justify-center rounded-full transition-all duration-200 ${
                      isActive
                        ? 'p-[1.5px] ring-2 ring-[#2E6B34] ring-offset-2 ring-offset-[#FAF6EC] scale-105'
                        : 'ring-1 ring-gray-400/60 hover:ring-[#2E6B34]/60'
                    }`}
                  >
                    <ProfileAvatar
                      userId={user.id}
                      name={user.name}
                      className="w-6 h-6 rounded-full bg-[#E8E1D5] text-[10px] font-bold text-[#2E6B34] object-cover"
                    />
                  </div>
                ) : (
                  <Icon className={`w-5 h-5 ${isActive ? 'text-[#2E6B34] stroke-[2.5]' : 'stroke-[1.8]'}`} />
                )}
              </div>
              <span className={`text-[10px] sm:text-[11px] leading-tight mt-0.5 truncate max-w-full ${isActive ? 'text-[#2E6B34]' : ''}`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#2E6B34] mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
