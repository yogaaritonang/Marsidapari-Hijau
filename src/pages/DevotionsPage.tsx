import React, { useState } from 'react';
import {
  BookOpen,
  Sparkles,
  Bookmark,
  BookmarkCheck,
  Flame,
  CheckCircle,
  X,
  Send,
  Wifi,
  Share2,
} from 'lucide-react';
import { Devotion, User } from '../types';
import { StorageService } from '../services/storageService';
import { AIService } from '../services/aiService';
import { BatakGorgaBorder } from '../components/BatakPattern';

interface DevotionsPageProps {
  user: User;
  onSelectChallenge: (challengeId?: string) => void;
}

export const DevotionsPage: React.FC<DevotionsPageProps> = ({ user, onSelectChallenge }) => {
  const [devotions, setDevotions] = useState<Devotion[]>(StorageService.getDevotions());
  const [filter, setFilter] = useState<'all' | 'favorites'>('all');
  const [selectedDevotion, setSelectedDevotion] = useState<Devotion | null>(() => StorageService.getTodayDevotion() || devotions[0]);
  const [showAiModal, setShowAiModal] = useState(false);
  const [topicOrMood, setTopicOrMood] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copyToast, setCopyToast] = useState(false);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    StorageService.toggleFavoriteDevotion(id);
    const updated = StorageService.getDevotions();
    setDevotions(updated);
    if (selectedDevotion?.id === id) {
      setSelectedDevotion({ ...selectedDevotion, isFavorite: !selectedDevotion.isFavorite });
    }
  };

  const handleGenerateCustom = async () => {
    if (!topicOrMood.trim() || generating) return;

    setGenerating(true);
    try {
      const { data } = await AIService.generateReflection(
        topicOrMood,
        user.name,
        user.communityName
      );

      const newDev: Devotion = {
        id: 'dev-custom-' + Date.now(),
        title: data.title,
        scripture: data.scripture,
        verseText: data.verse_text,
        content: data.body,
        callToAction: data.call_to_action,
        batakWisdom: data.batak_wisdom || 'Marsiadapari mamparbuehon denggan',
        readingTime: data.reading_time_minutes || 1,
        linkedChallengeId: 'chal-tumbler',
        isCustom: true,
        date: new Date().toISOString().split('T')[0],
      };

      StorageService.addCustomDevotion(newDev);
      const updated = StorageService.getDevotions();
      setDevotions(updated);
      setSelectedDevotion(newDev);
      setShowAiModal(false);
      setTopicOrMood('');
    } catch {
      // Handled
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 2000);
  };

  const displayedList = devotions.filter((d) => {
    if (filter === 'favorites') return d.isFavorite;
    return true;
  });

  return (
    <div className="space-y-4 pb-24 pt-2 px-4">
      {/* Header with Title & AI Generator Button */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-[#7A5230] uppercase tracking-wider">
            Firman &amp; Bumi Ciptaan
          </span>
          <h2 className="text-lg font-bold font-poppins text-[#1F2A1F]">
            Renungan Ciptaan Harian
          </h2>
        </div>

        <button
          onClick={() => setShowAiModal(true)}
          className="touch-target inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#2E6B34] to-[#1F4B23] text-white text-xs font-bold hover:shadow-md transition active:scale-95 shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>Buat untukku</span>
        </button>
      </div>

      {/* Offline Status Badge */}
      <div className="p-2.5 rounded-2xl bg-white border border-[#2E6B34]/15 flex items-center justify-between text-xs text-gray-700 shadow-xs">
        <div className="flex items-center gap-1.5 text-[#2E6B34] font-semibold">
          <Wifi className="w-3.5 h-3.5" />
          <span>Tersedia Offline (Tersimpan Lokal)</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              filter === 'all'
                ? 'bg-[#2E6B34] text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Semua ({devotions.length})
          </button>
          <button
            onClick={() => setFilter('favorites')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              filter === 'favorites'
                ? 'bg-[#2E6B34] text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Favorit
          </button>
        </div>
      </div>

      {/* Selected Devotion Featured Reader */}
      {selectedDevotion && (
        <div className="rounded-3xl bg-white border border-[#2E6B34]/25 p-5 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold text-[#2E6B34] bg-[#A8D5A2]/30 px-2 py-0.5 rounded-md">
                  {selectedDevotion.scripture}
                </span>
                <span className="text-[10px] text-gray-500 font-medium">
                  {selectedDevotion.readingTime} menit baca
                </span>
                {selectedDevotion.isCustom && (
                  <span className="text-[10px] text-purple-700 bg-purple-100 font-bold px-1.5 py-0.5 rounded-md">
                    AI Personal
                  </span>
                )}
              </div>
              <h3 className="text-base font-extrabold font-poppins text-[#1F2A1F] leading-snug">
                {selectedDevotion.title}
              </h3>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={(e) => toggleFavorite(selectedDevotion.id, e)}
                className="touch-target p-1.5 rounded-full text-gray-400 hover:text-amber-500 hover:bg-gray-50 transition"
                title="Simpan ke Favorit"
              >
                {selectedDevotion.isFavorite ? (
                  <BookmarkCheck className="w-5 h-5 text-amber-500 fill-amber-500" />
                ) : (
                  <Bookmark className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={() =>
                  handleCopy(
                    `${selectedDevotion.title}\n${selectedDevotion.scripture}: "${selectedDevotion.verseText}"\n\n${selectedDevotion.content}\n\nAjakan Aksi: ${selectedDevotion.callToAction}`
                  )
                }
                className="touch-target p-1.5 rounded-full text-gray-400 hover:text-[#2E6B34] hover:bg-gray-50 transition"
                title="Salin Renungan"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scripture Verse Quote Card */}
          <div className="p-3.5 bg-[#FAF6EC] rounded-2xl border-l-4 border-[#2E6B34] text-xs italic text-gray-800 leading-relaxed font-serif">
            "{selectedDevotion.verseText}"
          </div>

          {/* Body Content */}
          <div className="text-sm text-gray-700 leading-relaxed space-y-2 whitespace-pre-line">
            {selectedDevotion.content}
          </div>

          {/* Batak Wisdom Card */}
          {selectedDevotion.batakWisdom && (
            <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-xs text-amber-900">
              <span className="font-bold block text-[#7A5230] mb-0.5">
                Kearifan Batak (Umpasa / Umpama):
              </span>
              <p className="italic">{selectedDevotion.batakWisdom}</p>
            </div>
          )}

          {/* Call to Action & Button */}
          <div className="p-4 rounded-2xl bg-[#A8D5A2]/25 border border-[#2E6B34]/20 space-y-2.5">
            <div>
              <span className="text-[11px] font-bold text-[#2E6B34] uppercase tracking-wider block">
                Ajakan Aksi Nyata Hari Ini:
              </span>
              <p className="text-xs text-gray-800 font-medium mt-0.5">
                {selectedDevotion.callToAction}
              </p>
            </div>

            <button
              onClick={() => onSelectChallenge(selectedDevotion.linkedChallengeId)}
              className="w-full touch-target py-2.5 rounded-xl bg-[#2E6B34] text-white text-xs font-bold hover:bg-[#235328] transition active:scale-95 shadow-md flex items-center justify-center gap-1.5"
            >
              <Flame className="w-4 h-4 text-[#A8D5A2]" />
              <span>Ambil Tantangan Aksi Terkait</span>
            </button>
          </div>
        </div>
      )}

      {copyToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[#1F2A1F] text-white px-4 py-2 rounded-full text-xs font-semibold shadow-lg">
          Naskah renungan berhasil disalin!
        </div>
      )}

      {/* Devotion List Carousel / Stack */}
      <div className="space-y-2 pt-2">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#7A5230] font-poppins">
          Daftar Renungan Ciptaan ({displayedList.length})
        </h3>

        <div className="space-y-2">
          {displayedList.map((dev) => {
            const isCurrent = selectedDevotion?.id === dev.id;
            return (
              <div
                key={dev.id}
                onClick={() => setSelectedDevotion(dev)}
                className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                  isCurrent
                    ? 'bg-white border-[#2E6B34] shadow-md ring-1 ring-[#2E6B34]/30'
                    : 'bg-white/80 border-gray-200 hover:bg-white hover:border-gray-300 shadow-xs'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                      isCurrent
                        ? 'bg-[#2E6B34] text-white'
                        : 'bg-[#A8D5A2]/30 text-[#2E6B34]'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-semibold text-[#7A5230] block">
                      {dev.scripture}
                    </span>
                    <h4 className="text-xs font-bold text-[#1F2A1F] truncate leading-tight">
                      {dev.title}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => toggleFavorite(dev.id, e)}
                    className="p-1.5 text-gray-400 hover:text-amber-500"
                  >
                    {dev.isFavorite ? (
                      <BookmarkCheck className="w-4 h-4 text-amber-500 fill-amber-500" />
                    ) : (
                      <Bookmark className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Personalized Devotion Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-[#FAF6EC] border border-[#2E6B34]/25 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <div className="flex items-center gap-2 text-[#2E6B34]">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold font-poppins">
                  Buat Renungan untukku
                </h3>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="p-1 text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Ketikkan topik (misal: <em>Danau Toba, sampah plastik, lelah skripsi, air bersih</em>) atau suasana hatimu hari ini:
            </p>

            <textarea
              rows={3}
              value={topicOrMood}
              onChange={(e) => setTopicOrMood(e.target.value)}
              placeholder="misal: Saya merasa lelah dan butuh ketenangan saat melihat Danau Toba..."
              className="w-full text-xs bg-white border border-gray-300 rounded-2xl p-3 text-[#1F2A1F] focus:border-[#2E6B34] focus:outline-hidden resize-none"
            />

            <div className="flex flex-wrap gap-1.5">
              {['Danau Toba', 'Air Bersih Silindung', 'Tanam Pohon', 'Lelah Skripsi', 'Plastik Sekali Pakai'].map(
                (quick) => (
                  <button
                    key={quick}
                    type="button"
                    onClick={() => setTopicOrMood(quick)}
                    className="text-[11px] bg-white border border-gray-200 px-2.5 py-1 rounded-full text-gray-700 hover:border-[#2E6B34] hover:text-[#2E6B34] transition"
                  >
                    {quick}
                  </button>
                )
              )}
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="px-3 py-2 text-xs font-semibold text-gray-600"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!topicOrMood.trim() || generating}
                onClick={handleGenerateCustom}
                className="flex-1 py-2.5 rounded-xl bg-[#2E6B34] text-white text-xs font-bold hover:bg-[#235328] disabled:opacity-50 transition active:scale-95 shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>{generating ? 'Menyusun Renungan...' : 'Susun Renungan Otomatis'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
