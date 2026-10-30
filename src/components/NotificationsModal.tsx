import React from 'react';
import { Bell, Heart, MessageCircle, Bookmark, Trophy, X, CheckCheck, Sparkles } from 'lucide-react';
import { AppNotification } from '../types';
import { SocialSyncService } from '../services/socialSyncService';

interface NotificationsModalProps {
  notifications: AppNotification[];
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  notifications,
  isOpen,
  onClose,
  userId,
}) => {
  if (!isOpen) return null;

  const userNotifications = notifications.filter((n) => n.recipientUserId === userId);
  const unreadCount = userNotifications.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    SocialSyncService.markNotificationRead(undefined, userId);
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const mins = Math.floor(diffMs / (1000 * 60));
      if (mins < 1) return 'Baru saja';
      if (mins < 60) return `${mins} mnt yang lalu`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours} jam yang lalu`;
      const days = Math.floor(hours / 24);
      return `${days} hari yang lalu`;
    } catch {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-3 sm:p-4">
      <div className="relative w-full max-w-md rounded-3xl bg-[#FAF6EC] border border-[#2E6B34]/20 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2E6B34]/15 bg-white/90 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-50 text-[#2E6B34]">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#1F2A1F] font-poppins flex items-center gap-2">
                Notifikasi Interaksi
                {unreadCount > 0 && (
                  <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white">
                    {unreadCount} baru
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-gray-500">Aktivitas suka, komentar, &amp; dukungan jemaat</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mark All Read Button */}
        {unreadCount > 0 && (
          <div className="flex justify-between items-center bg-emerald-50/70 px-5 py-2 border-b border-emerald-100 text-xs">
            <span className="text-[#2E6B34] font-medium text-[11px]">Ada {unreadCount} interaksi belum dibaca</span>
            <button
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1 font-bold text-[#2E6B34] hover:underline text-[11px]"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Tandai semua dibaca
            </button>
          </div>
        )}

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 divide-y divide-gray-100">
          {userNotifications.length === 0 ? (
            <div className="py-12 text-center text-gray-500 space-y-2">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                <Sparkles className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-gray-700">Belum ada notifikasi baru</p>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                Saat pengguna lain menyukai postingan Threads, membalas komentar, atau memberi love di Leaderboard, Anda akan melihatnya di sini!
              </p>
            </div>
          ) : (
            userNotifications.map((n) => {
              const isUnread = !n.read;
              return (
                <div
                  key={n.id}
                  onClick={() => {
                    if (isUnread) SocialSyncService.markNotificationRead(n.id);
                  }}
                  className={`flex items-start gap-3 p-3 rounded-2xl cursor-pointer transition ${
                    isUnread
                      ? 'bg-white border border-[#2E6B34]/20 shadow-xs'
                      : 'hover:bg-white/60 opacity-80'
                  }`}
                >
                  {/* Icon depending on notification type */}
                  <div className="mt-0.5 shrink-0">
                    {n.type === 'thread_like' && (
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-50 text-red-500">
                        <Heart className="h-4 w-4 fill-red-500" />
                      </div>
                    )}
                    {n.type === 'thread_reply' && (
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <MessageCircle className="h-4 w-4" />
                      </div>
                    )}
                    {n.type === 'thread_save' && (
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                        <Bookmark className="h-4 w-4" />
                      </div>
                    )}
                    {n.type === 'leaderboard_cheer' && (
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-pink-50 text-pink-500">
                        <Trophy className="h-4 w-4 text-amber-500" />
                      </div>
                    )}
                  </div>

                  {/* Text details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-bold text-[#1F2A1F] truncate">{n.title}</p>
                      <span className="text-[10px] text-gray-500 shrink-0">{formatTime(n.createdAt)}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-700 leading-snug">{n.message}</p>
                  </div>

                  {isUnread && (
                    <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 self-center" />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 bg-white/70 px-4 py-2.5 text-center">
          <p className="text-[10px] text-gray-500">
            Terus bergotong royong dan saling mendukung demi Danau Toba yang lestari! 🌿
          </p>
        </div>
      </div>
    </div>
  );
};
