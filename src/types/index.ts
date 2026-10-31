export type UserRole = 'anggota' | 'pemimpin' | 'admin';

export interface LaunchScreenSettings {
  enabled: boolean;
  title: string;
  subtitle: string;
  verseText: string;
  verseRef: string;
  logoUrl?: string;
  bgGradient?: string;
  durationMs?: number;
  durationSeconds?: number;
}

export interface EcotheologyArticle {
  id: string;
  title: string;
  category: 'mandatum_creationis' | 'marsiadapari_alam' | 'danau_toba_lestari' | 'teologi_tanah' | 'refleksi_pemuda' | 'kearifan_lokal' | 'danau_toba' | 'keberlanjutan_alam' | string;
  summary: string;
  content: string;
  scriptureRef: string;
  scriptureText: string;
  batakWisdom: string;
  coverImage?: string;
  author: string;
  publishedAt: string;
  actionCall?: string;
  isFeatured?: boolean;
}

export interface BrandSettings {
  name: string;
  logoUrl: string;
  tagline?: string;
  description?: string;
  primaryColor?: string;
  secondaryColor?: string;
  footerText?: string;
  contactEmail?: string;
  contactPhone?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  youtubeUrl?: string;
  websiteUrl?: string;
  address?: string;
  showChatbot?: boolean;
  allowGuestChat?: boolean;
  aiSystemPrompt?: string;
  geminiApiKey?: string;
  geminiModel?: string;
  launchScreen?: LaunchScreenSettings;
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
  lastActiveTimestamp?: string;
  lastChallengeDate?: string;
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
  coordinates?: [number, number];
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
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  submittedBy?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'model';
  text: string;
  timestamp: string;
  actionTag?: string; // e.g. "[REKOMENDASI: Bawa Tumbler]"
}

export type ThreadCategory = 'ide' | 'keluhan' | 'aksi' | 'tanya';

export interface ThreadReply {
  id: string;
  userId: string;
  userName: string;
  userRole?: UserRole;
  communityName?: string;
  content: string;
  createdAt: string;
}

export interface ThreadPost {
  id: string;
  userId: string;
  userName: string;
  userRole?: UserRole;
  communityName?: string;
  category: ThreadCategory;
  caption: string;
  imageUrl?: string;
  createdAt: string;
  likes: number;
  likedBy?: string[];
  savedBy?: string[];
  replies?: ThreadReply[];
  isPinned?: boolean;
  status?: 'aktif' | 'ditindaklanjuti' | 'selesai';
}

export type NotificationType = 'thread_like' | 'thread_reply' | 'thread_save' | 'leaderboard_cheer';

export interface AppNotification {
  id: string;
  recipientUserId: string;
  senderUserId: string;
  senderName: string;
  type: NotificationType;
  targetId: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

