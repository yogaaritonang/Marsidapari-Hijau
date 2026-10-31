import React, { useState, useEffect, useRef } from 'react';
import {
  Heart,
  MessageCircle,
  Share2,
  Image as ImageIcon,
  Send,
  X,
  Sparkles,
  AlertCircle,
  Lightbulb,
  CheckCircle2,
  Trash2,
  Camera,
  CornerDownRight,
  ShieldCheck,
  RotateCcw,
  Bookmark,
} from 'lucide-react';
import { User, ThreadPost, ThreadCategory, ThreadReply } from '../types';
import { StorageService } from '../services/storageService';
import { compressImage } from '../services/imageCompression';
import { ShareService } from '../services/shareService';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { SocialSyncService } from '../services/socialSyncService';

interface ThreadsPageProps {
  user: User;
  isGuest: boolean;
  onRequireAuth: () => void;
}

export const ThreadsPage: React.FC<ThreadsPageProps> = ({ user, isGuest, onRequireAuth }) => {
  const [threads, setThreads] = useState<ThreadPost[]>(StorageService.getThreads());
  const [caption, setCaption] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ThreadCategory>('ide');
  const [image, setImage] = useState<string>('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [activeTab, setActiveTab] = useState<'semua' | ThreadCategory>('semua');
  const [replyOpenId, setReplyOpenId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<{ [threadId: string]: string }>({});
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Sync latest threads from server immediately
    void SocialSyncService.pullSocialData(user);

    const handleUpdate = () => {
      setThreads(StorageService.getThreads());
    };

    const handleFocus = () => {
      void SocialSyncService.pullSocialData(user);
    };

    window.addEventListener('mh-data-updated', handleUpdate);
    window.addEventListener('mh-threads-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    // Continuous polling so likes and comments from other users appear live
    const pollInterval = setInterval(() => {
      void SocialSyncService.pullSocialData(user);
    }, 8000);

    return () => {
      window.removeEventListener('mh-data-updated', handleUpdate);
      window.removeEventListener('mh-threads-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      clearInterval(pollInterval);
    };
  }, [user]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isGuest) {
      e.target.value = '';
      onRequireAuth();
      return;
    }

    setIsCompressing(true);
    try {
      // Compress image instantly so it uploads and renders lightning fast
      const { dataUrl } = await compressImage(file, 900, 900, 0.78);
      setImage(dataUrl);
      showToast('📸 Foto siap dibagikan!');
    } catch {
      showToast('Gagal memproses gambar. Coba format JPG atau PNG.');
    } finally {
      setIsCompressing(false);
      e.target.value = '';
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuest) {
      onRequireAuth();
      return;
    }

    if (!caption.trim() && !image) {
      showToast('Tuliskan ide, keluhan, atau sertakan foto terlebih dahulu.');
      return;
    }

    const newPost: ThreadPost = {
      id: `th-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      communityName: user.communityName,
      category: selectedCategory,
      caption: caption.trim(),
      imageUrl: image || undefined,
      createdAt: new Date().toISOString(),
      likes: 0,
      likedBy: [],
      savedBy: [],
      status: 'aktif',
      replies: [],
    };

    setCaption('');
    setImage('');
    await SocialSyncService.createThread(newPost);
    setThreads(StorageService.getThreads());
    showToast('✨ Utas berhasil diposting!');
  };

  const handleLike = async (threadId: string) => {
    if (isGuest) {
      onRequireAuth();
      return;
    }
    await SocialSyncService.toggleLikeThread(threadId, user);
    setThreads(StorageService.getThreads());
  };

  const handleSave = async (threadId: string) => {
    if (isGuest) {
      onRequireAuth();
      return;
    }
    const isSaved = await SocialSyncService.toggleSaveThread(threadId, user.id);
    setThreads(StorageService.getThreads());
    showToast(isSaved ? '📌 Utas disimpan!' : 'Utas batal disimpan.');
  };

  const handleAddReply = async (threadId: string) => {
    if (isGuest) {
      onRequireAuth();
      return;
    }
    const text = replyText[threadId]?.trim();
    if (!text) return;

    const reply: ThreadReply = {
      id: `rep-${Date.now()}`,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      communityName: user.communityName,
      content: text,
      createdAt: new Date().toISOString(),
    };

    setReplyText((prev) => ({ ...prev, [threadId]: '' }));
    await SocialSyncService.addThreadReply(threadId, reply);
    setThreads(StorageService.getThreads());
    showToast('💬 Balasan terkirim!');
  };

  const handleDeletePost = async (threadId: string) => {
    if (confirm('Hapus postingan ini?')) {
      await SocialSyncService.deleteThread(threadId);
      setThreads(StorageService.getThreads());
      showToast('Postingan dihapus.');
    }
  };

  const handleToggleStatus = (threadId: string, currentStatus?: string) => {
    const nextStatus = currentStatus === 'ditindaklanjuti' ? 'selesai' : 'ditindaklanjuti';
    StorageService.updateThreadStatus(threadId, nextStatus);
    setThreads(StorageService.getThreads());
    showToast(`Status diubah: ${nextStatus === 'selesai' ? 'Selesai Ditangani' : 'Ditindaklanjuti Gereja/Admin'}`);
  };

  const handleShareThread = async (post: ThreadPost) => {
    const text = `🌿 [Threads Marsiadapari] "${post.caption}" oleh ${post.userName} (${post.communityName || 'Danau Toba'})\n\nGabung & simak diskusi di: ${window.location.origin}`;
    if (ShareService.isWebShareSupported()) {
      try {
        await navigator.share({
          title: `Utas Marsiadapari - ${post.userName}`,
          text,
          url: window.location.origin,
        });
        showToast('Berhasil dibagikan!');
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    await navigator.clipboard.writeText(text);
    showToast('📋 Teks utas berhasil disalin!');
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'Baru saja';
    if (diff < 3600) return `${Math.floor(diff / 60)} mnt`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam`;
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  const filteredThreads = threads.filter((t) => {
    if (activeTab === 'semua') return true;
    return t.category === activeTab;
  });

  return (
    <div className="mx-auto max-w-[640px] px-3 pb-28 pt-2 sm:px-4">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 rounded-2xl bg-[#2E6B34] text-white px-4 py-2.5 shadow-xl text-xs font-bold animate-in fade-in flex items-center gap-2">
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Threads Header */}
      <div className="mb-3 flex items-center justify-between border-b border-[#2E6B34]/15 pb-2.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black font-poppins text-[#1F2A1F] tracking-tight">Threads</span>
            <span className="rounded-full bg-[#A8D5A2]/35 border border-[#2E6B34]/20 px-2 py-0.5 text-[10px] font-extrabold text-[#2E6B34]">
              Suara Hijau
            </span>
          </div>
          <p className="text-xs text-[#7A5230] mt-0.5">
            Bagikan foto instan, ide aksi, dan keluhan lingkungan di Tarutung &amp; Danau Toba
          </p>
        </div>
      </div>

      {/* Threads Feed Category Filter */}
      <div className="mb-4 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'semua', label: 'Semua Utas' },
          { id: 'ide', label: '💡 Ide Hijau' },
          { id: 'keluhan', label: '📢 Keluhan' },
          { id: 'aksi', label: '📸 Aksi Nyata' },
          { id: 'tanya', label: '❓ Tanya Jemaat' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-[#2E6B34] text-white shadow-xs'
                : 'bg-white/80 border border-gray-200 text-gray-600 hover:bg-white hover:text-[#2E6B34]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Threads Composer Box */}
      <div className="mb-4 rounded-3xl bg-white border border-[#2E6B34]/20 p-4 shadow-sm">
        <form onSubmit={handleCreatePost} className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 shrink-0">
              <ProfileAvatar
                userId={user.id}
                name={user.name}
                className="h-10 w-10 rounded-full bg-gradient-to-br from-[#2E6B34] to-[#1F4B23] text-sm font-bold text-white shadow-xs"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-[#1F2A1F]">{user.name}</span>
                <span className="text-[10px] text-gray-400">{user.communityName}</span>
              </div>

              {/* Category selector chips */}
              <div className="flex flex-wrap gap-1 mb-2">
                {[
                  { id: 'ide', label: '💡 Ide' },
                  { id: 'keluhan', label: '📢 Keluhan' },
                  { id: 'aksi', label: '📸 Aksi' },
                  { id: 'tanya', label: '❓ Tanya' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id as ThreadCategory)}
                    className={`rounded-lg px-2 py-0.5 text-[10px] font-bold transition ${
                      selectedCategory === cat.id
                        ? 'bg-emerald-100 text-[#2E6B34] border border-emerald-300'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder={
                  isGuest
                    ? 'Masuk ke akun untuk berbagi ide atau keluhan...'
                    : selectedCategory === 'keluhan'
                    ? 'Laporkan keluhan lingkungan yang perlu gotong royong (misal: sampah di sungai, jalan berdebu)...'
                    : selectedCategory === 'ide'
                    ? 'Bagikan ide aksi kreatif untuk merawat Danau Toba & kampus...'
                    : 'Mulai utas baru atau bagikan aksi lingkungan hari ini...'
                }
                rows={3}
                className="w-full resize-none rounded-xl border border-gray-200 p-2.5 text-xs text-[#1F2A1F] placeholder:text-gray-400 focus:border-[#2E6B34] focus:outline-none focus:ring-2 focus:ring-[#2E6B34]/15"
                disabled={isGuest}
              />
            </div>
          </div>

          {/* Photo Preview if attached */}
          {Boolean(image && image.trim()) && (
            <div className="relative mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-black/5 aspect-video flex items-center justify-center">
              <img src={image} alt="Pratinjau foto instan" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => setImage('')}
                className="absolute right-2.5 top-2.5 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80 transition"
                title="Hapus foto"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Actions & Submit */}
          <div className="flex items-center justify-between border-t border-gray-100 pt-2.5">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isGuest || isCompressing}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-[#FAF6EC] px-2.5 py-1.5 text-xs font-bold text-[#2E6B34] hover:bg-emerald-50 active:scale-95 transition disabled:opacity-50"
              >
                <Camera className="h-4 w-4 text-emerald-600" />
                <span className="text-[11px]">{isCompressing ? 'Memproses...' : 'Foto Instan'}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            <button
              type="submit"
              disabled={isGuest || (!caption.trim() && !image)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#2E6B34] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#235328] active:scale-95 transition disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Posting</span>
            </button>
          </div>
        </form>
      </div>

      {/* Threads Timeline Feed */}
      <div className="space-y-3">
        {filteredThreads.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#2E6B34]/30 bg-white/70 p-8 text-center text-gray-500">
            <Sparkles className="mx-auto h-8 w-8 text-[#2E6B34]/40 mb-2" />
            <p className="text-sm font-bold text-gray-700">Belum ada utas di kategori ini</p>
            <p className="text-xs text-gray-500 mt-1">Jadilah yang pertama membagikan ide atau foto aksi!</p>
          </div>
        ) : (
          filteredThreads.map((post) => {
            const hasLiked = (post.likedBy || []).includes(user.id);
            const hasSaved = (post.savedBy || []).includes(user.id);
            const isAuthorOrAdmin = user.id === post.userId || user.role === 'admin';
            const isReplyOpen = replyOpenId === post.id;
            const replies = post.replies || [];

            return (
              <article
                key={post.id}
                className="relative rounded-3xl bg-white border border-[#2E6B34]/15 p-4 shadow-xs transition hover:border-[#2E6B34]/30"
              >
                {/* Status banner for complaints */}
                {post.category === 'keluhan' && post.status && (
                  <div className="mb-2 flex items-center justify-between rounded-xl px-2.5 py-1 text-[11px] font-bold">
                    <span
                      className={`inline-flex items-center gap-1 ${
                        post.status === 'selesai'
                          ? 'text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md'
                          : post.status === 'ditindaklanjuti'
                          ? 'text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md'
                          : 'text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md'
                      }`}
                    >
                      {post.status === 'selesai' ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <AlertCircle className="h-3.5 w-3.5" />
                      )}
                      Status: {post.status === 'selesai' ? 'Selesai Dibersihkan' : post.status === 'ditindaklanjuti' ? 'Ditindaklanjuti Gereja/Admin' : 'Menunggu Aksi'}
                    </span>

                    {user.role === 'admin' && (
                      <button
                        onClick={() => handleToggleStatus(post.id, post.status)}
                        className="text-[10px] text-[#2E6B34] underline hover:text-[#1F4B23]"
                      >
                        Ubah Status
                      </button>
                    )}
                  </div>
                )}

                {/* Main Thread Content */}
                <div className="flex items-start gap-3">
                  {/* Left Column: Avatar + Threads line connector */}
                  <div className="flex flex-col items-center">
                    <ProfileAvatar
                      userId={post.userId}
                      name={post.userName}
                      className="h-10 w-10 rounded-full bg-gradient-to-br from-[#2E6B34] to-[#1F4B23] text-sm font-bold text-white shadow-xs shrink-0"
                    />
                    {replies.length > 0 && (
                      <div className="w-0.5 flex-1 bg-gray-200 mt-2 min-h-[24px]" />
                    )}
                  </div>

                  {/* Right Column: Author, Post Body, Image, Actions */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-[#1F2A1F]">{post.userName}</span>
                        {post.userRole === 'admin' && (
                          <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[9px] font-extrabold text-[#2E6B34]">
                            Admin
                          </span>
                        )}
                        {post.userRole === 'pemimpin' && (
                          <span className="rounded-full bg-amber-100 px-1.5 py-0.2 text-[9px] font-extrabold text-amber-800">
                            Pemimpin
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400">&bull; {formatTimeAgo(post.createdAt)}</span>
                      </div>

                      {/* Category Badge & Admin Delete */}
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${
                            post.category === 'keluhan'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : post.category === 'ide'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : post.category === 'aksi'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-sky-50 text-sky-800 border border-sky-200'
                          }`}
                        >
                          {post.category}
                        </span>

                        {isAuthorOrAdmin && (
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="p-1 text-gray-400 hover:text-rose-600 transition"
                            title="Hapus utas"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-[11px] text-[#7A5230] mb-2">{post.communityName || 'Danau Toba'}</p>

                    {/* Post Caption */}
                    {post.caption && (
                      <p className="text-xs text-[#1F2A1F] whitespace-pre-line leading-relaxed">
                        {post.caption}
                      </p>
                    )}

                    {/* Instant Photo Attachment */}
                    {Boolean(post.imageUrl && post.imageUrl.trim()) && (
                      <div className="mt-2.5 overflow-hidden rounded-2xl border border-gray-200 max-h-[380px] bg-black/5">
                        <img
                          src={post.imageUrl}
                          alt="Foto aksi gotong royong"
                          className="w-full h-auto object-cover max-h-[380px]"
                          loading="lazy"
                        />
                      </div>
                    )}

                    {/* Threads Interaction Bar */}
                    <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 border-t border-gray-100 pt-2">
                      {/* Like */}
                      <button
                        onClick={() => handleLike(post.id)}
                        className={`flex items-center gap-1.5 font-bold transition active:scale-95 ${
                          hasLiked ? 'text-rose-600' : 'hover:text-rose-600'
                        }`}
                        title="Suka postingan"
                      >
                        <Heart className={`h-4 w-4 ${hasLiked ? 'fill-rose-600' : ''}`} />
                        <span>{post.likes > 0 ? post.likes : ''}</span>
                      </button>

                      {/* Reply */}
                      <button
                        onClick={() => setReplyOpenId(isReplyOpen ? null : post.id)}
                        className="flex items-center gap-1.5 font-bold hover:text-[#2E6B34] transition active:scale-95"
                        title="Balas utas"
                      >
                        <MessageCircle className="h-4 w-4" />
                        <span>{replies.length > 0 ? replies.length : 'Balas'}</span>
                      </button>

                      {/* Save / Bookmark */}
                      <button
                        onClick={() => handleSave(post.id)}
                        className={`flex items-center gap-1.5 font-bold transition active:scale-95 ${
                          hasSaved ? 'text-amber-600' : 'hover:text-amber-600'
                        }`}
                        title={hasSaved ? 'Tersimpan' : 'Simpan utas'}
                      >
                        <Bookmark className={`h-4 w-4 ${hasSaved ? 'fill-amber-500 text-amber-600' : ''}`} />
                        <span>{(post.savedBy || []).length > 0 ? (post.savedBy || []).length : ''}</span>
                      </button>

                      {/* Share */}
                      <button
                        onClick={() => handleShareThread(post)}
                        className="flex items-center gap-1 font-bold hover:text-[#2E6B34] transition active:scale-95 ml-auto"
                        title="Bagikan utas"
                      >
                        <Share2 className="h-4 w-4" />
                        <span className="hidden sm:inline text-[11px]">Bagikan</span>
                      </button>
                    </div>

                    {/* Nested Replies & Reply Input */}
                    {isReplyOpen && (
                      <div className="mt-3 space-y-2.5 border-t border-gray-100 pt-2.5 animate-in fade-in">
                        {/* List existing replies */}
                        {replies.map((rep) => (
                          <div key={rep.id} className="flex items-start gap-2 text-xs bg-[#FAF6EC]/80 rounded-2xl p-2.5 border border-gray-200/80">
                            <CornerDownRight className="h-3.5 w-3.5 text-[#2E6B34] shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-[#1F2A1F]">{rep.userName}</span>
                                {rep.userRole === 'admin' && (
                                  <span className="text-[9px] bg-emerald-100 text-[#2E6B34] font-bold px-1 rounded">Admin</span>
                                )}
                                <span className="text-[10px] text-gray-400">&bull; {formatTimeAgo(rep.createdAt)}</span>
                              </div>
                              <p className="text-gray-700 mt-0.5 leading-relaxed">{rep.content}</p>
                            </div>
                          </div>
                        ))}

                        {/* Reply Input Form */}
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            value={replyText[post.id] || ''}
                            onChange={(e) => setReplyText({ ...replyText, [post.id]: e.target.value })}
                            placeholder={isGuest ? 'Masuk untuk membalas...' : 'Tulis tanggapan atau solusi...'}
                            disabled={isGuest}
                            className="flex-1 rounded-xl border border-gray-200 px-3 py-1.5 text-xs text-[#1F2A1F] focus:border-[#2E6B34] focus:outline-none"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddReply(post.id);
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleAddReply(post.id)}
                            disabled={isGuest || !replyText[post.id]?.trim()}
                            className="rounded-xl bg-[#2E6B34] p-2 text-white hover:bg-[#235328] disabled:opacity-40 transition"
                            title="Kirim balasan"
                          >
                            <Send className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
};
