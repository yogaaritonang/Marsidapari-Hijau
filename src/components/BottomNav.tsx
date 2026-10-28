import React from 'react';
import { Home, Flame, Trees, Users, User as UserIcon } from 'lucide-react';

export type NavTabId = 'home' | 'challenges' | 'garden' | 'community' | 'profile';

interface BottomNavProps {
  currentTab: NavTabId;
  onChangeTab: (tab: NavTabId) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onChangeTab }) => {
  const tabs: Array<{ id: NavTabId; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'home', label: 'Beranda', icon: Home },
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

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`touch-target relative flex flex-1 flex-col items-center justify-center rounded-xl px-1 py-2 transition-all duration-200 md:py-2.5 ${
                isActive
                  ? 'text-[#2E6B34] font-bold'
                  : 'text-gray-500 hover:text-[#2E6B34] font-medium'
              }`}
            >
              <div
                className={`w-9 h-7 flex items-center justify-center rounded-full transition-all duration-200 ${
                  isActive ? 'bg-[#A8D5A2]/35 scale-110' : ''
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#2E6B34] stroke-[2.5]' : 'stroke-[1.8]'}`} />
              </div>
              <span className={`text-[11px] leading-tight mt-0.5 ${isActive ? 'text-[#2E6B34]' : ''}`}>
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
