import React, { useState } from 'react';
import {
  ScrollText,
  Sparkles,
  Copy,
  Printer,
  BookOpen,
  Share2,
  CheckCircle2,
  Clock,
  Church,
} from 'lucide-react';
import { PrayerResponse } from '../../api/prayer';
import { AIService } from '../services/aiService';
import { User } from '../types';

interface LiturgyPageProps {
  user: User;
}

export const LiturgyPage: React.FC<LiturgyPageProps> = ({ user }) => {
  const [type, setType] = useState<'doa_singkat' | 'doa_syukur_panen' | 'liturgi_minggu_ciptaan'>('liturgi_minggu_ciptaan');
  const [theme, setTheme] = useState('Merawat Air Bersih Danau Toba & Lembah Silindung');
  const [duration, setDuration] = useState('Ibadah Lengkap (~60 menit)');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<PrayerResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!theme.trim() || generating) return;

    setGenerating(true);
    try {
      const { data } = await AIService.generatePrayer(
        type,
        theme,
        duration,
        user.communityName
      );
      setResult(data);
    } catch {
      // Handled in service
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    const fullText = `${result.title}\nAyat: ${result.bible_verse}\n\n${result.content}\n\nPetunjuk: ${result.instructions || '-'}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 pb-24 pt-2 px-4 print:p-0">
      {/* Header */}
      <div className="print:hidden">
        <span className="text-xs font-bold text-[#7A5230] uppercase tracking-wider">
          Liturgi &amp; Doa Ekologis
        </span>
        <h2 className="text-lg font-bold font-poppins text-[#1F2A1F]">
          Doa &amp; Liturgi Ciptaan AI
        </h2>
        <p className="text-xs text-gray-600 mt-0.5">
          Susun liturgi Minggu Ciptaan, doa syukur panen, atau doa singkat bernuansa teologi Batak
        </p>
      </div>

      {/* Generator Controls Card */}
      <div className="rounded-3xl bg-white border border-[#2E6B34]/25 p-5 shadow-xs space-y-3.5 print:hidden">
        {/* Type selector */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">
            Pilih Jenis Naskah:
          </label>
          <div className="grid grid-cols-3 gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setType('doa_singkat')}
              className={`p-2.5 rounded-xl text-center font-bold transition ${
                type === 'doa_singkat'
                  ? 'bg-[#2E6B34] text-white shadow-xs'
                  : 'bg-gray-50 border text-gray-700 hover:bg-gray-100'
              }`}
            >
              Doa Singkat
            </button>
            <button
              type="button"
              onClick={() => setType('doa_syukur_panen')}
              className={`p-2.5 rounded-xl text-center font-bold transition ${
                type === 'doa_syukur_panen'
                  ? 'bg-[#2E6B34] text-white shadow-xs'
                  : 'bg-gray-50 border text-gray-700 hover:bg-gray-100'
              }`}
            >
              Syukur Panen
            </button>
            <button
              type="button"
              onClick={() => setType('liturgi_minggu_ciptaan')}
              className={`p-2.5 rounded-xl text-center font-bold transition ${
                type === 'liturgi_minggu_ciptaan'
                  ? 'bg-[#2E6B34] text-white shadow-xs'
                  : 'bg-gray-50 border text-gray-700 hover:bg-gray-100'
              }`}
            >
              Minggu Ciptaan
            </button>
          </div>
        </div>

        {/* Theme Input */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            Tema Ibadah / Doa:
          </label>
          <input
            type="text"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="misal: Kelestarian Danau Toba & Gotong Royong Silindung"
            className="w-full text-xs bg-white border border-gray-300 rounded-xl px-3 py-2 text-[#1F2A1F] focus:border-[#2E6B34] focus:outline-hidden"
          />

          <div className="flex flex-wrap gap-1 mt-1.5">
            {[
              'Merawat Air Danau Toba',
              'Syukur Panen Padi Silindung',
              'Pemulihan Hutan Batak',
              'Generasi Muda Anti-Plastik',
            ].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setTheme(s)}
                className="text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-0.5 rounded-md"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Duration selector */}
        {type === 'liturgi_minggu_ciptaan' && (
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Perkiraan Durasi Ibadah:
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full text-xs bg-white border border-gray-300 rounded-xl px-3 py-2 text-[#1F2A1F] focus:border-[#2E6B34] focus:outline-hidden"
            >
              <option value="Ringkas (15-20 menit persekutuan)">Ringkas (15-20 menit persekutuan)</option>
              <option value="Sedang (30-40 menit)">Sedang (30-40 menit)</option>
              <option value="Ibadah Lengkap (~60 menit)">Ibadah Lengkap Minggu (~60 menit)</option>
            </select>
          </div>
        )}

        <button
          type="button"
          disabled={!theme.trim() || generating}
          onClick={handleGenerate}
          className="w-full py-2.5 rounded-xl bg-[#2E6B34] text-white text-xs font-bold hover:bg-[#235328] disabled:opacity-50 transition active:scale-95 shadow-md flex items-center justify-center gap-1.5"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>{generating ? 'Menyusun Naskah Liturgi...' : 'Susun Doa / Liturgi Ciptaan'}</span>
        </button>
      </div>

      {/* Generated Result Container */}
      {result && (
        <div className="rounded-3xl bg-white border border-[#2E6B34]/30 p-5 shadow-sm space-y-4 print:border-none print:shadow-none print:p-0">
          <div className="flex items-center justify-between pb-3 border-b border-gray-200">
            <div>
              <span className="text-[10px] font-bold text-[#7A5230] uppercase tracking-wider block">
                {result.type === 'liturgi_minggu_ciptaan' ? 'Tata Ibadah' : 'Doa Ciptaan'}
              </span>
              <h3 className="text-base font-bold font-poppins text-[#1F2A1F]">
                {result.title}
              </h3>
              <p className="text-xs text-[#2E6B34] font-medium mt-0.5">
                {result.bible_verse}
              </p>
            </div>

            <div className="flex items-center gap-1 print:hidden">
              <button
                onClick={handleCopy}
                className="touch-target p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
                title="Salin Teks"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={handlePrint}
                className="touch-target p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
                title="Cetak Naskah"
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>
          </div>

          {copied && (
            <div className="p-2 text-center text-xs font-semibold text-emerald-800 bg-emerald-50 rounded-xl">
              Naskah liturgi berhasil disalin ke clipboard!
            </div>
          )}

          {result.instructions && (
            <div className="p-3 bg-[#FAF6EC] rounded-2xl border-l-3 border-[#2E6B34] text-xs text-gray-700 italic">
              <strong>Petunjuk Liturgis:</strong> {result.instructions}
            </div>
          )}

          {/* Liturgy Text Body */}
          <div className="text-xs sm:text-sm text-gray-800 whitespace-pre-line leading-relaxed font-serif bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
            {result.content}
          </div>
        </div>
      )}
    </div>
  );
};
