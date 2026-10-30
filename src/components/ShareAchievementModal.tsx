import React, { useState } from 'react';
import {
  Share2,
  X,
  Copy,
  Check,
  Send,
  Sparkles,
  Award,
  Trees,
  Trash2,
  MessageCircle,
} from 'lucide-react';
import { ShareService, ShareDataPayload, getRankTitle } from '../services/shareService';

interface ShareAchievementModalProps {
  isOpen: boolean;
  onClose: () => void;
  payload: ShareDataPayload;
}

export const ShareAchievementModal: React.FC<ShareAchievementModalProps> = ({
  isOpen,
  onClose,
  payload,
}) => {
  const [copied, setCopied] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const rank = payload.rankTitle || getRankTitle(payload.points);
  const shareText = ShareService.getShareText(payload);
  const isWebShareAvailable = ShareService.isWebShareSupported();

  const handleNativeShare = async () => {
    const result = await ShareService.shareAchievement(payload);
    if (result.success) {
      if (result.method === 'native') {
        setStatusMsg('🎉 Berhasil dibagikan!');
        setTimeout(() => setStatusMsg(null), 3000);
      } else if (result.method === 'clipboard') {
        setCopied(true);
        setStatusMsg('📋 Pesan ajakan berhasil disalin ke papan klip!');
        setTimeout(() => {
          setCopied(false);
          setStatusMsg(null);
        }, 3000);
      }
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setStatusMsg('📋 Teks & tautan berhasil disalin ke papan klip!');
      setTimeout(() => {
        setCopied(false);
        setStatusMsg(null);
      }, 3000);
    } catch {
      setStatusMsg('Gagal menyalin teks');
    }
  };

  const openExternal = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl bg-[#FAF6EC] border border-[#2E6B34]/20 p-5 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-gray-500 hover:bg-black/5 transition"
          aria-label="Tutup modal berbagi"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="pr-8">
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-[#2E6B34]">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            Ajak Sahabat &amp; Jemaat
          </span>
          <h3 className="text-lg font-bold font-poppins text-[#1F2A1F]">
            Bagikan Capaian Aksi Hijau
          </h3>
          <p className="text-xs text-gray-600 mt-0.5">
            Sebarkan semangat gotong royong Marsiadapari untuk merawat alam Danau Toba.
          </p>
        </div>

        {/* Toast Alert */}
        {statusMsg && (
          <div className="rounded-2xl bg-emerald-100 border border-emerald-300 p-2.5 text-xs font-bold text-emerald-900 text-center animate-in fade-in">
            {statusMsg}
          </div>
        )}

        {/* Achievement Card Preview */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#2E6B34] via-[#235328] to-[#1F4B23] p-5 text-white shadow-lg space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase text-[#A8D5A2]">
                {rank}
              </span>
              <h4 className="mt-1 text-base font-bold font-poppins">
                {payload.name || 'Sahabat Hijau'}
              </h4>
              <p className="text-xs text-[#A8D5A2]/90">
                {payload.communityName || 'Kawasan Danau Toba'}
              </p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md text-amber-300 border border-white/20 shadow-inner">
              <Award className="h-7 w-7" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-xl bg-black/20 p-2.5 text-center backdrop-blur-xs border border-white/10">
            <div>
              <p className="text-[10px] uppercase font-semibold text-white/70">Poin Hijau</p>
              <p className="text-lg font-black text-amber-300 font-poppins">{payload.points}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-semibold text-white/70">Bibit Pohon</p>
              <p className="text-lg font-black text-[#A8D5A2] font-poppins">{payload.trees ?? 0}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-semibold text-white/70">Sampah Dipilah</p>
              <p className="text-lg font-black text-cyan-200 font-poppins">{payload.wasteKg ?? 0} kg</p>
            </div>
          </div>

          <div className="border-t border-white/15 pt-2 flex items-center justify-between text-[11px] text-white/80">
            <span>🌿 Marsiadapari Hijau</span>
            <span className="italic">Merawat Ciptaan Allah</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          {/* Primary Share Action */}
          <button
            onClick={handleNativeShare}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#2E6B34] py-3 px-4 text-sm font-bold text-white shadow-md hover:bg-[#235328] active:scale-[0.98] transition"
          >
            <Share2 className="h-4 w-4" />
            {isWebShareAvailable ? 'Bagikan Lewat Aplikasi (Web Share)' : 'Salin & Bagikan Capaian'}
          </button>

          {/* Social Quick Shortcuts */}
          <div className="grid grid-cols-4 gap-2 pt-1">
            {/* WhatsApp */}
            <button
              onClick={() => openExternal(ShareService.getWhatsAppUrl(payload))}
              className="flex flex-col items-center gap-1 rounded-2xl border border-emerald-200 bg-white p-2.5 text-center transition hover:bg-emerald-50 active:scale-95"
              title="Bagikan ke WhatsApp"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#25D366] text-white shadow-xs">
                <MessageCircle className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-bold text-gray-700">WhatsApp</span>
            </button>

            {/* Telegram */}
            <button
              onClick={() => openExternal(ShareService.getTelegramUrl(payload))}
              className="flex flex-col items-center gap-1 rounded-2xl border border-sky-200 bg-white p-2.5 text-center transition hover:bg-sky-50 active:scale-95"
              title="Bagikan ke Telegram"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#229ED9] text-white shadow-xs">
                <Send className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-bold text-gray-700">Telegram</span>
            </button>

            {/* Facebook */}
            <button
              onClick={() => openExternal(ShareService.getFacebookUrl())}
              className="flex flex-col items-center gap-1 rounded-2xl border border-blue-200 bg-white p-2.5 text-center transition hover:bg-blue-50 active:scale-95"
              title="Bagikan ke Facebook"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1877F2] text-white shadow-xs">
                <span className="font-bold text-sm">f</span>
              </div>
              <span className="text-[10px] font-bold text-gray-700">Facebook</span>
            </button>

            {/* Copy Link */}
            <button
              onClick={handleCopy}
              className="flex flex-col items-center gap-1 rounded-2xl border border-gray-200 bg-white p-2.5 text-center transition hover:bg-gray-50 active:scale-95"
              title="Salin Teks & Link"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FAF6EC] border border-gray-300 text-gray-700 shadow-xs">
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </div>
              <span className="text-[10px] font-bold text-gray-700">{copied ? 'Tersalin' : 'Salin'}</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-gray-500">
          Setiap teman yang bergabung membawa berkat bagi Danau Toba dan sesama.
        </p>
      </div>
    </div>
  );
};
