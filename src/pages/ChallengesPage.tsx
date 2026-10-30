import React, { useState } from 'react';
import {
  Flame,
  Search,
  Filter,
  CheckCircle2,
  Trees,
  Droplets,
  Zap,
  Trash2,
  Camera,
  Info,
  X,
  ChevronRight,
} from 'lucide-react';
import { Challenge, User } from '../types';
import { StorageService } from '../services/storageService';

interface ChallengesPageProps {
  user: User;
  onOpenVerifyModal: (challenge: Challenge) => void;
}

export const ChallengesPage: React.FC<ChallengesPageProps> = ({
  user,
  onOpenVerifyModal,
}) => {
  const challenges = StorageService.getChallenges();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDetail, setActiveDetail] = useState<Challenge | null>(null);

  const categories = [
    { id: 'all', label: 'Semua' },
    { id: 'harian', label: 'Harian' },
    { id: 'mingguan', label: 'Mingguan' },
    { id: 'danau_toba', label: 'Danau Toba' },
    { id: 'komunitas', label: 'Komunitas IAKN' },
  ];

  const filteredChallenges = challenges.filter((c) => {
    const matchesCat = selectedCategory === 'all' || c.category === selectedCategory;
    const matchesQuery =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-28 pt-3 px-4 sm:px-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-[#7A5230] uppercase tracking-wider">
            Marsiadapari Nyata
          </span>
          <h2 className="text-lg font-bold font-poppins text-[#1F2A1F]">
            Tantangan Aksi Hijau
          </h2>
        </div>

        <div className="text-right">
          <span className="text-xs font-bold text-[#2E6B34] bg-[#A8D5A2]/30 px-2.5 py-1 rounded-full">
            {filteredChallenges.length} Tantangan
          </span>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari tantangan: tumbler, pohon, sampah..."
          className="w-full text-xs bg-white border border-gray-300 rounded-2xl pl-10 pr-4 py-2.5 text-[#1F2A1F] focus:border-[#2E6B34] focus:outline-hidden shadow-xs"
        />
      </div>

      {/* Category Filter Chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`touch-target shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition active:scale-95 ${
              selectedCategory === cat.id
                ? 'bg-[#2E6B34] text-white shadow-xs'
                : 'bg-white border border-gray-200 text-gray-700 hover:border-[#2E6B34]/30'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Challenges List */}
      <div className="space-y-3">
        {filteredChallenges.map((chal) => (
          <div
            key={chal.id}
            className="rounded-3xl bg-white border border-gray-200/90 hover:border-[#2E6B34]/40 shadow-xs p-4 space-y-3 transition"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#A8D5A2]/30 text-[#2E6B34] flex items-center justify-center font-bold text-xl shrink-0 mt-0.5">
                  {chal.id.includes('tumbler')
                    ? '🥤'
                    : chal.id.includes('pohon')
                    ? '🌱'
                    : chal.id.includes('sampah')
                    ? '♻️'
                    : chal.id.includes('plastik')
                    ? '🛍️'
                    : chal.id.includes('listrik')
                    ? '⚡'
                    : chal.id.includes('air')
                    ? '💧'
                    : chal.id.includes('danau')
                    ? '🌊'
                    : chal.id.includes('kompos')
                    ? '🪴'
                    : chal.id.includes('jalan')
                    ? '🚶'
                    : '🌿'}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold text-[#7A5230] uppercase tracking-wider">
                      {chal.category}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-gray-300" />
                    <span className="text-[10px] font-semibold text-gray-500">
                      {chal.difficulty}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[#1F2A1F] leading-snug">
                    {chal.title}
                  </h3>
                  <p className="text-xs text-gray-600 line-clamp-2 mt-1 leading-relaxed">
                    {chal.description}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="inline-block text-xs font-extrabold text-[#2E6B34] bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl shadow-2xs">
                  +{chal.points} Poin
                </span>
              </div>
            </div>

            {/* Impact Badges */}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium">
                {chal.estimatedImpact.wasteKg && (
                  <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    <Trash2 className="w-3 h-3" />
                    -{chal.estimatedImpact.wasteKg} kg
                  </span>
                )}
                {chal.estimatedImpact.trees && (
                  <span className="flex items-center gap-1 text-green-800 bg-green-50 px-2 py-0.5 rounded-md">
                    <Trees className="w-3 h-3" />
                    +{chal.estimatedImpact.trees} pohon
                  </span>
                )}
                {chal.estimatedImpact.waterLiters && (
                  <span className="flex items-center gap-1 text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-md">
                    <Droplets className="w-3 h-3" />
                    +{chal.estimatedImpact.waterLiters} L
                  </span>
                )}
                {chal.estimatedImpact.electricityKwh && (
                  <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                    <Zap className="w-3 h-3" />
                    -{chal.estimatedImpact.electricityKwh} kWh
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setActiveDetail(chal)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  title="Detail Instruksi"
                >
                  <Info className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onOpenVerifyModal(chal)}
                  className="touch-target inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2E6B34] text-white text-xs font-bold hover:bg-[#235328] transition active:scale-95 shadow-sm"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Unggah Bukti</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Challenge Detail Modal */}
      {activeDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-[#FAF6EC] border border-[#2E6B34]/25 p-5 shadow-2xl space-y-4">
            <div className="flex items-start justify-between pb-2 border-b border-gray-200">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#7A5230]">
                  Panduan Pelaksanaan
                </span>
                <h3 className="text-sm font-bold font-poppins text-[#1F2A1F]">
                  {activeDetail.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveDetail(null)}
                className="p-1 text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-gray-700 space-y-2.5">
              <div>
                <span className="font-bold text-gray-900 block">Deskripsi:</span>
                <p className="mt-0.5">{activeDetail.description}</p>
              </div>

              <div>
                <span className="font-bold text-gray-900 block">Cara Memotret Bukti:</span>
                <p className="mt-0.5 bg-white p-2.5 rounded-xl border border-gray-200">
                  {activeDetail.instruction}
                </p>
              </div>

              <div className="p-2.5 bg-[#A8D5A2]/25 rounded-xl border border-[#2E6B34]/20 text-[#2E6B34] font-medium">
                Poin yang Diperoleh: <strong>+{activeDetail.points} Poin</strong> jika foto terverifikasi valid oleh AI (confidence &ge; 75%).
              </div>
            </div>

            <button
              onClick={() => {
                const target = activeDetail;
                setActiveDetail(null);
                onOpenVerifyModal(target);
              }}
              className="w-full py-2.5 rounded-xl bg-[#2E6B34] text-white text-xs font-bold hover:bg-[#235328] transition active:scale-95 shadow-md flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4" />
              <span>Buka Kamera &amp; Unggah Bukti</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
