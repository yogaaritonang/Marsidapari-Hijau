export interface PointBadge {
  id: string;
  title: string;
  description: string;
  requiredPoints: number;
  icon: string;
}

export const POINT_BADGES: PointBadge[] = [
  {
    id: 'sahabat-pohon',
    title: 'Sahabat Pohon',
    description: 'Kumpulkan 50 Poin Hijau dari aksi yang terverifikasi.',
    requiredPoints: 50,
    icon: '🌱',
  },
  {
    id: 'penjaga-danau',
    title: 'Penjaga Danau',
    description: 'Kumpulkan 100 Poin Hijau untuk menjaga alam dan perairan.',
    requiredPoints: 100,
    icon: '🌊',
  },
  {
    id: 'marsiadapari-sejati',
    title: 'Marsiadapari Sejati',
    description: 'Kumpulkan 250 Poin Hijau melalui semangat gotong royong.',
    requiredPoints: 250,
    icon: '🤝',
  },
  {
    id: 'pelindung-ciptaan',
    title: 'Pelindung Ciptaan',
    description: 'Kumpulkan 500 Poin Hijau untuk merawat seluruh ciptaan.',
    requiredPoints: 500,
    icon: '🏆',
  },
];
