import React, { useState } from 'react';
import {
  Trees,
  Droplet,
  Sparkles,
  Award,
  ChevronRight,
  Heart,
  Users,
  Sun,
  ShieldCheck,
} from 'lucide-react';
import { User, GardenState, Community } from '../types';
import { StorageService } from '../services/storageService';
import { BatakGorgaBorder } from '../components/BatakPattern';

interface GardenPageProps {
  user: User;
  onNavigateTab: (tab: string) => void;
  onRequireAuth: () => void;
}

export const GardenPage: React.FC<GardenPageProps> = ({ user, onNavigateTab, onRequireAuth }) => {
  const [garden, setGarden] = useState<GardenState>(
    user.id === 'guest-preview' ? StorageService.getPreviewGarden() : StorageService.getGardenState(),
  );
  const [communities] = useState<Community[]>(StorageService.getCommunities());
  const [wateringAnim, setWateringAnim] = useState(false);
  const [waterMsg, setWaterMsg] = useState<string | null>(null);

  const userCommunity =
    communities.find((c) => c.id === user.communityId) || {
      id: 'umum',
      name: 'Komunitas Marsiadapari Hijau',
      category: 'Komunitas Warga' as const,
      location: 'Tapanuli Utara',
      memberCount: 0,
      totalPoints: 0,
      treesPlanted: 0,
      treeTarget: 0,
      actionCount: 0,
      actionTarget: 0,
      description: '',
    };

  const handleWater = () => {
    if (user.id === 'guest-preview') {
      onRequireAuth();
      return;
    }
    setWateringAnim(true);
    const res = StorageService.waterPlant();
    setGarden(res.garden);
    setWaterMsg(res.message);

    setTimeout(() => {
      setWateringAnim(false);
    }, 1500);

    setTimeout(() => {
      setWaterMsg(null);
    }, 3500);
  };

  const getStageGraphic = () => {
    switch (garden.stage) {
      case 'Tunas':
        return {
          icon: '🌱',
          title: 'Tunas Pengharapan',
          desc: 'Benih iman dan aksi gotong royong yang baru mulai berakar.',
          bg: 'from-amber-100 to-emerald-100',
        };
      case 'Tanaman Muda':
        return {
          icon: '🌿',
          title: 'Tanaman Muda Berbunga',
          desc: 'Bertumbuh subur disiram kebiasaan baik setiap hari.',
          bg: 'from-emerald-100 to-green-200',
        };
      case 'Pohon Teduh':
        return {
          icon: '🌳',
          title: 'Pohon Teduh Silindung',
          desc: 'Mengikat tanah, menaungi sesama, dan memberi kesejukan bagi sekitar.',
          bg: 'from-green-100 to-teal-200',
        };
      case 'Kebun Rindang':
      default:
        return {
          icon: '🏞️',
          title: 'Kebun Rindang Danau Toba',
          desc: 'Ekosistem harmonis yang menghasilkan buah berkat berlimpah.',
          bg: 'from-emerald-200 to-blue-200',
        };
    }
  };

  const stageInfo = getStageGraphic();
  const progressPercent = Math.min(
    100,
    Math.round((garden.currentExp / garden.neededExp) * 100)
  );

  return (
    <div className="space-y-4 pb-24 pt-2 px-4">
      {/* Header */}
      <div>
        <span className="text-xs font-bold text-[#7A5230] uppercase tracking-wider">
          Tumbuh Bersama Ciptaan
        </span>
        <h2 className="text-lg font-bold font-poppins text-[#1F2A1F]">
          Taman Kita &amp; Hutan Komunitas
        </h2>
        <p className="text-xs text-gray-600 mt-0.5">
          Setiap bukti aksi dan gotong royong menyuburkan tamanmu serta hutan bersama
        </p>
      </div>

      {/* Virtual Garden Card */}
      <div className="rounded-3xl bg-white border border-[#2E6B34]/25 p-5 shadow-sm space-y-4 relative overflow-hidden">
        {/* Top Tag & Level */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#2E6B34]" />
            <span className="text-xs font-bold text-[#2E6B34]">
              Taman Pribadi: Level {garden.level}
            </span>
          </div>

          <span className="text-xs font-extrabold text-[#7A5230] bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
            {garden.waterCount}x Disiram
          </span>
        </div>

        {/* Garden Centerpiece Visual */}
        <div
          className={`h-48 rounded-2xl bg-gradient-to-b ${stageInfo.bg} flex flex-col items-center justify-center relative overflow-hidden border border-emerald-200/50 shadow-inner`}
        >
          {/* Subtle sun in background */}
          <Sun className="w-8 h-8 text-amber-400 absolute top-3 right-4 opacity-70 animate-spin [animation-duration:30s]" />

          {/* Plant Icon & Animation */}
          <div
            className={`text-6xl transition-transform duration-500 ${
              wateringAnim ? 'scale-125 rotate-6' : 'hover:scale-110'
            }`}
          >
            {stageInfo.icon}
          </div>

          {/* Watering droplet animation */}
          {wateringAnim && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Droplet className="w-10 h-10 text-cyan-500 animate-ping" />
            </div>
          )}

          <div className="text-center mt-2 z-10">
            <h3 className="text-sm font-bold font-poppins text-[#1F2A1F]">
              {stageInfo.title}
            </h3>
            <p className="text-[11px] text-gray-700 max-w-[240px] px-2 leading-tight mt-0.5">
              {stageInfo.desc}
            </p>
          </div>
        </div>

        {/* Experience Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 font-medium">Pertumbuhan Taman</span>
            <span className="font-bold text-[#2E6B34]">
              {garden.currentExp} / {garden.neededExp} EXP ({progressPercent}%)
            </span>
          </div>
          <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#2E6B34] via-[#4CAF50] to-[#A8D5A2] h-full rounded-full transition-all duration-700"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Water button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleWater}
            disabled={wateringAnim}
            className="flex-1 touch-target py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs font-bold hover:shadow-md transition active:scale-95 flex items-center justify-center gap-2 shadow-sm"
          >
            <Droplet className="w-4 h-4 fill-white" />
            <span>{user.id === 'guest-preview' ? 'Masuk untuk menyiram tanaman' : 'Siram Tanaman Air Silindung (+10 EXP)'}</span>
          </button>
        </div>

        {waterMsg && (
          <div className="text-center py-1.5 px-3 text-xs font-semibold text-emerald-800 bg-emerald-50 rounded-xl border border-emerald-200 animate-in fade-in">
            {waterMsg}
          </div>
        )}

        {/* Encouraging Scripture Verse */}
        <div className="p-3 bg-[#FAF6EC] rounded-2xl text-xs text-gray-700 italic border-l-3 border-[#2E6B34]">
          "Ia seperti pohon, yang ditanam di tepi aliran air, yang menghasilkan buahnya pada musimnya, dan yang tidak layu daunnya." (Mazmur 1:3)
        </div>
      </div>

      {/* Community Forest (Hutan Komunitas IAKN & Gereja) */}
      <div className="rounded-3xl bg-white border border-[#2E6B34]/25 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#2E6B34] text-white flex items-center justify-center font-bold">
              <Trees className="w-5 h-5 text-[#A8D5A2]" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-poppins text-[#1F2A1F]">
                Hutan Komunitas: {userCommunity.name.split('(')[0]}
              </h3>
              <p className="text-[11px] text-gray-500">
                {userCommunity.treeTarget > 0
                  ? 'Pohon bersama untuk kawasan tangkapan air Danau Toba'
                  : 'Data hutan komunitas belum tersedia'}
              </p>
            </div>
          </div>
        </div>

        {/* Community Tree Target Progress */}
        <div className="p-4 rounded-2xl bg-[#A8D5A2]/20 border border-[#2E6B34]/20 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#1F2A1F]">
              Capaian Penanaman Pohon:
            </span>
            <span className="text-xs font-extrabold text-[#2E6B34]">
              {userCommunity.treeTarget > 0
                ? `${userCommunity.treesPlanted} dari ${userCommunity.treeTarget} Pohon`
                : 'Belum ada data'}
            </span>
          </div>

          <div className="w-full bg-white h-3 rounded-full overflow-hidden border border-gray-200">
            <div
              className="bg-gradient-to-r from-[#2E6B34] to-[#3B8EA5] h-full rounded-full transition-all duration-700"
              style={{
                width: userCommunity.treeTarget > 0
                  ? `${Math.min(100, Math.round((userCommunity.treesPlanted / userCommunity.treeTarget) * 100))}%`
                  : '0%',
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-center pt-1 text-xs">
            <div className="bg-white p-2 rounded-xl border border-gray-200">
              <span className="text-[10px] text-gray-500 block">Total Aksi Hijau</span>
              <span className="text-sm font-extrabold text-[#2E6B34]">
                {userCommunity.actionCount} Aksi
              </span>
            </div>
            <div className="bg-white p-2 rounded-xl border border-gray-200">
              <span className="text-[10px] text-gray-500 block">Anggota Aktif</span>
              <span className="text-sm font-extrabold text-[#7A5230]">
                {userCommunity.memberCount} Orang
              </span>
            </div>
          </div>
        </div>

        {/* Other Communities Standing in Gotong Royong */}
        <div className="space-y-2 pt-1">
          <h4 className="text-xs font-bold text-gray-700">
            Hutan Komunitas Mitra se-Tapanuli Utara:
          </h4>
          <div className="space-y-1.5">
            {communities.map((c) => (
              <div
                key={c.id}
                className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">🌲</span>
                  <div>
                    <span className="font-bold text-gray-800 block truncate max-w-[190px]">
                      {c.name.split('(')[0]}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {c.location}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-[#2E6B34] block">
                    {c.treesPlanted} Pohon
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {c.actionCount} aksi
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Button to plant tree */}
        <button
          onClick={() => onNavigateTab('challenges')}
          className="w-full touch-target py-2.5 rounded-xl bg-[#2E6B34] text-white text-xs font-bold hover:bg-[#235328] transition active:scale-95 shadow-md flex items-center justify-center gap-1.5"
        >
          <Trees className="w-4 h-4 text-[#A8D5A2]" />
          <span>Ambil Tantangan Tanam Pohon (+60 Poin)</span>
        </button>
      </div>
    </div>
  );
};
