export type UserRole = 'anggota' | 'pemimpin' | 'admin';

export interface BrandSettings {
  name: string;
  logoUrl: string;
}

export interface UserPreferences {
  fontSize: 'normal' | 'besar';
  darkMode: boolean;
  dataSaver: boolean;
  notifications: boolean;
  isAnonymous: boolean;
}

export interface User {
  id: string;
  name: string;
  contact: string; // Email or HP
  role: UserRole;
  communityId: string;
  communityName: string;
  points: number;
  streakDays: number;
  lastActiveDate: string;
  joinedDate: string;
  preferences: UserPreferences;
}

export interface Community {
  id: string;
  name: string;
  category: 'Kampus' | 'Gereja' | 'Pemuda' | 'Komunitas Warga';
  location: string;
  memberCount: number;
  totalPoints: number;
  treesPlanted: number;
  treeTarget: number;
  actionCount: number;
  actionTarget: number;
  description: string;
}

export interface Devotion {
  id: string;
  title: string;
  scripture: string;
  verseText: string;
  content: string;
  callToAction: string;
  batakWisdom: string;
  readingTime: number; // in minutes
  linkedChallengeId?: string;
  isFavorite?: boolean;
  isCustom?: boolean;
  date: string;
}

export interface Challenge {
  id: string;
  title: string;
  category: 'harian' | 'mingguan' | 'komunitas' | 'danau_toba';
  difficulty: 'Mudah' | 'Sedang' | 'Tantangan Khusus';
  points: number;
  iconName: string;
  description: string;
  instruction: string;
  estimatedImpact: {
    wasteKg?: number;
    trees?: number;
    waterLiters?: number;
    electricityKwh?: number;
  };
  featured?: boolean;
}

export interface ChallengeSubmission {
  id: string;
  userId: string;
  userName: string;
  isAnonymous: boolean;
  challengeId: string;
  challengeTitle: string;
  category: string;
  submittedAt: string;
  imageThumbnail: string; // base64 compressed
  imageHash: string;
  userNotes?: string;
  verdict: 'valid' | 'perlu_tinjauan' | 'tidak_valid';
  confidence: number;
  yang_terlihat: string;
  alasan: string;
  saran: string;
  impact: {
    wasteKg: number;
    trees: number;
    waterLiters: number;
    electricityKwh: number;
  };
  awardedPoints: number;
  reviewedBy?: string;
}

export interface GardenState {
  stage: 'Tunas' | 'Tanaman Muda' | 'Pohon Teduh' | 'Kebun Rindang';
  level: number;
  currentExp: number;
  neededExp: number;
  waterCount: number;
  lastWatered: string;
}

export interface EnvironmentalReport {
  id: string;
  title: string;
  category: 'Sampah Menumpuk' | 'Pencemaran Danau Toba / Sungai' | 'Penebangan Liar' | 'Kerusakan Lahan';
  locationName: string;
  coordinates: [number, number];
  rawNotes: string;
  formalDescription: string;
  recommendedAction: string;
  urgency: 'Rendah' | 'Sedang' | 'Tinggi';
  status: 'Dilaporkan' | 'Ditinjau Pemimpin' | 'Gotong Royong Dijadwalkan' | 'Selesai';
  reportedBy: string;
  reportedAt: string;
  photoUrl?: string;
}

export interface GreenEvent {
  id: string;
  title: string;
  type: 'Ibadah Hijau' | 'Aksi Bersih' | 'Penanaman Pohon' | 'Lokakarya Kompos';
  date: string;
  time: string;
  location: string;
  organizer: string;
  description: string;
  registeredCount: number;
  isRegistered: boolean;
  qrCode: string;
}

export interface MapMarkerLocation {
  id: string;
  title: string;
  category: 'bank_sampah' | 'tanam_pohon' | 'bersih_danau' | 'mata_air';
  description: string;
  coordinates: [number, number]; // [lat, lng]
  address: string;
  contactPerson?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'model';
  text: string;
  timestamp: string;
  actionTag?: string; // e.g. "[REKOMENDASI: Bawa Tumbler]"
}
