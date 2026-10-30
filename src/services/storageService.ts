import {
  User,
  Community,
  Devotion,
  Challenge,
  ChallengeSubmission,
  GardenState,
  EnvironmentalReport,
  GreenEvent,
  MapMarkerLocation,
  BrandSettings,
  ThreadPost,
  ThreadReply,
} from '../types';
import {
  SEED_COMMUNITIES,
  SEED_DEVOTIONS,
  SEED_CHALLENGES,
  SEED_LOCATIONS,
  SEED_EVENTS,
  SEED_THREADS,
} from '../data/seedData';
import { POINT_BADGES } from '../data/badges';
import { UserService } from './userService';

const CIPHER_KEY = 'marsiadapari-hijau-iakn-toba-2026';

function encryptData(raw: string): string {
  try {
    let result = '';
    for (let i = 0; i < raw.length; i++) {
      const charCode = raw.charCodeAt(i) ^ CIPHER_KEY.charCodeAt(i % CIPHER_KEY.length);
      result += String.fromCharCode(charCode);
    }
    return 'enc_' + btoa(encodeURIComponent(result));
  } catch {
    return raw;
  }
}

function decryptData(cipher: string): string {
  try {
    if (!cipher.startsWith('enc_')) return cipher;
    const decoded = decodeURIComponent(atob(cipher.slice(4)));
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i) ^ CIPHER_KEY.charCodeAt(i % CIPHER_KEY.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch {
    return cipher;
  }
}

const STORAGE_KEYS = {
  USER: 'mh_user',
  COMMUNITIES: 'mh_communities',
  DEVOTIONS: 'mh_devotions',
  CHALLENGES: 'mh_challenges',
  SUBMISSIONS: 'mh_submissions',
  GARDEN: 'mh_garden',
  REPORTS: 'mh_reports',
  EVENTS: 'mh_events',
  LOCATIONS: 'mh_locations',
  ONBOARDED: 'mh_onboarded',
  BRAND: 'mh_brand',
  THREADS: 'mh_threads',
};

function awardPoints(user: User, points: number): string[] {
  const previousPoints = user.points;
  user.points += points;
  const newlyUnlocked = POINT_BADGES
    .filter((badge) => previousPoints < badge.requiredPoints && user.points >= badge.requiredPoints)
    .map((badge) => badge.id);
  if (newlyUnlocked.length > 0) {
    const pending = StorageService.getPendingBadgeUnlocks(user.id);
    StorageService.setPendingBadgeUnlocks(user.id, [...new Set([...pending, ...newlyUnlocked])]);
  }
  return newlyUnlocked;
}

function notifyBadgeUnlocks(userId: string, badgeIds: string[]): void {
  if (badgeIds.length === 0) return;
  window.dispatchEvent(new CustomEvent('mh-badges-unlocked', {
    detail: { userId, badgeIds },
  }));
}

type SharedCollection = 'brand' | 'challenges' | 'communities' | 'devotions' | 'events' | 'locations' | 'reports' | 'threads';

function notifySharedDataChange(collection: SharedCollection, values: unknown[]): void {
  window.dispatchEvent(new CustomEvent('mh-shared-data-change', {
    detail: { collection, values },
  }));
  window.dispatchEvent(new CustomEvent('mh-data-updated', {
    detail: { collection, values },
  }));
}

const DEFAULT_BRAND: BrandSettings = {
  name: 'Marsiadapari Hijau',
  logoUrl: '',
  tagline: '"Merawat ciptaan Tuhan, bergotong royong setiap hari."',
  description: 'Aplikasi Ekoteologi Kristen & Gotong Royong Danau Toba untuk Jemaat dan Mahasiswa IAKN Tarutung',
  primaryColor: '#2E6B34',
  secondaryColor: '#A8D5A2',
  footerText: 'Horas ma dihita saluhutna, mauliate!',
  showChatbot: true,
  allowGuestChat: true,
  aiSystemPrompt: '',
  geminiApiKey: '',
  geminiModel: 'gemini-3.5-flash',
};

export const DEFAULT_USER: User = {
  id: 'guest-preview',
  name: 'Pengunjung',
  contact: '',
  role: 'anggota',
  communityId: 'umum',
  communityName: 'Komunitas Marsiadapari Hijau',
  points: 0,
  streakDays: 0,
  lastActiveDate: new Date().toISOString().split('T')[0],
  joinedDate: new Date().toISOString().split('T')[0],
  preferences: {
    fontSize: 'normal',
    darkMode: false,
    dataSaver: false,
    notifications: true,
    isAnonymous: false,
  },
};

export class StorageService {
  static getPreviewGarden(): GardenState {
    return {
      stage: 'Tunas',
      level: 1,
      currentExp: 0,
      neededExp: 100,
      waterCount: 0,
      lastWatered: '',
    };
  }

  private static getItem<T>(key: string, defaultValue: T): T {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return defaultValue;
      const decrypted = decryptData(stored);
      return JSON.parse(decrypted);
    } catch {
      return defaultValue;
    }
  }

  private static setItem<T>(key: string, value: T): void {
    try {
      const json = JSON.stringify(value);
      const encrypted = encryptData(json);
      localStorage.setItem(key, encrypted);
    } catch (e) {
      console.warn('Storage quota exceeded or unavailable', e);
    }
  }

  static getTodayDateString(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  static getDaysDifference(dateStr1: string, dateStr2: string): number {
    try {
      const d1 = new Date(dateStr1 + 'T00:00:00');
      const d2 = new Date(dateStr2 + 'T00:00:00');
      const diffMs = d2.getTime() - d1.getTime();
      return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  }

  /**
   * Synchronizes and resets the user's consecutive day streak if a day was missed without entering (>24 jam).
   */
  static syncUserStreak(user: User): User {
    if (!user || user.id === 'guest-preview') return user;

    const synced = UserService.recordDailyVisit(user);
    this.saveUser(synced);
    return synced;
  }

  static getUser(): User {
    const user = this.getItem<User>(STORAGE_KEYS.USER, DEFAULT_USER);
    if (user && user.id !== 'guest-preview') {
      return this.syncUserStreak(user);
    }
    return user;
  }

  static saveUser(user: User): void {
    this.setItem<User>(STORAGE_KEYS.USER, user);
  }

  static updateUser(updates: Partial<User>): User {
    const current = this.getUser();
    const updated = { ...current, ...updates };
    this.saveUser(updated);
    return updated;
  }

  static isOnboarded(): boolean {
    return this.getItem<boolean>(STORAGE_KEYS.ONBOARDED, false);
  }

  static setOnboarded(val: boolean): void {
    this.setItem<boolean>(STORAGE_KEYS.ONBOARDED, val);
  }

  static getPendingBadgeUnlocks(userId: string): string[] {
    return this.getItem<string[]>(`mh_pending_badges_${userId}`, []);
  }

  static consumePendingBadgeUnlocks(userId: string): string[] {
    const key = `mh_pending_badges_${userId}`;
    const pending = this.getItem<string[]>(key, []);
    this.setItem<string[]>(key, []);
    return pending;
  }

  static setPendingBadgeUnlocks(userId: string, badgeIds: string[]): void {
    this.setItem<string[]>(`mh_pending_badges_${userId}`, badgeIds);
  }

  static getBrandSettings(): BrandSettings {
    return this.getItem<BrandSettings>(STORAGE_KEYS.BRAND, DEFAULT_BRAND);
  }

  static saveBrandSettings(settings: BrandSettings): void {
    this.setItem<BrandSettings>(STORAGE_KEYS.BRAND, settings);
    notifySharedDataChange('brand', [{ id: 'global', ...settings }]);
    window.dispatchEvent(new CustomEvent('mh-brand-updated', { detail: settings }));
  }

  static getCommunities(): Community[] {
    return this.getItem<Community[]>(STORAGE_KEYS.COMMUNITIES, SEED_COMMUNITIES)
      .filter((community) => !['iakn-tarutung', 'hkbp-pearaja', 'gkpi-tarutung', 'pemuda-silindung'].includes(community.id));
  }

  static saveCommunities(communities: Community[]): void {
    this.setItem<Community[]>(STORAGE_KEYS.COMMUNITIES, communities);
    notifySharedDataChange('communities', communities);
  }

  static addCommunity(community: Community): void {
    const list = this.getCommunities();
    list.push(community);
    this.saveCommunities(list);
  }

  static getDevotions(): Devotion[] {
    return this.getItem<Devotion[]>(STORAGE_KEYS.DEVOTIONS, SEED_DEVOTIONS);
  }

  /**
   * Mengambil renungan harian yang berganti setiap harinya secara otomatis
   * atau sesuai tanggal yang diatur oleh admin.
   */
  static getTodayDevotion(): Devotion {
    const devotions = this.getDevotions();
    if (!devotions || devotions.length === 0) {
      return SEED_DEVOTIONS[0];
    }
    const today = this.getTodayDateString();
    // 1. Cek apakah ada renungan yang dijadwalkan khusus untuk tanggal hari ini
    const matched = devotions.find((d) => d.date === today);
    if (matched) return matched;

    // 2. Jika tidak ada, rotasi otomatis berdasarkan hari dalam tahun (day of the year)
    const [year, month, day] = today.split('-').map(Number);
    const dateObj = new Date(year, (month || 1) - 1, day || 1);
    const startOfYear = new Date(year, 0, 0);
    const dayOfYear = Math.floor((dateObj.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
    const index = Math.abs(dayOfYear) % devotions.length;
    return devotions[index];
  }

  static saveDevotions(devotions: Devotion[]): void {
    this.setItem<Devotion[]>(STORAGE_KEYS.DEVOTIONS, devotions);
    notifySharedDataChange('devotions', devotions);
  }

  static addCustomDevotion(devotion: Devotion): void {
    const list = this.getDevotions();
    list.unshift(devotion);
    this.saveDevotions(list);
  }

  static deleteDevotion(id: string): void {
    const list = this.getDevotions().filter((d) => d.id !== id);
    this.saveDevotions(list);
  }

  static saveDevotion(devotion: Devotion): void {
    const list = this.getDevotions();
    const existingIndex = list.findIndex((d) => d.id === devotion.id);
    if (existingIndex >= 0) {
      list[existingIndex] = devotion;
    } else {
      list.unshift(devotion);
    }
    this.saveDevotions(list);
  }

  static toggleFavoriteDevotion(id: string): void {
    const list = this.getDevotions();
    const item = list.find((d) => d.id === id);
    if (item) {
      item.isFavorite = !item.isFavorite;
      this.saveDevotions(list);
    }
  }

  static getChallenges(): Challenge[] {
    return this.getItem<Challenge[]>(STORAGE_KEYS.CHALLENGES, SEED_CHALLENGES);
  }

  static saveChallenges(challenges: Challenge[]): void {
    this.setItem<Challenge[]>(STORAGE_KEYS.CHALLENGES, challenges);
    notifySharedDataChange('challenges', challenges);
  }

  static getSubmissions(): ChallengeSubmission[] {
    return this.getItem<ChallengeSubmission[]>(STORAGE_KEYS.SUBMISSIONS, [])
      .filter((submission) => !['sub-1', 'sub-2', 'sub-3', 'sub-4'].includes(submission.id));
  }

  static saveSubmissions(submissions: ChallengeSubmission[]): void {
    this.setItem<ChallengeSubmission[]>(STORAGE_KEYS.SUBMISSIONS, submissions);
  }

  static addSubmission(sub: ChallengeSubmission): void {
    const list = this.getSubmissions();
    list.unshift(sub);
    this.saveSubmissions(list);

    if (sub.verdict === 'valid') {
      const user = this.getUser();
      const newlyUnlocked = awardPoints(user, sub.awardedPoints);

      const today = this.getTodayDateString();
      const lastChallenge = user.lastChallengeDate;

      if (!lastChallenge) {
        user.streakDays = 1;
        user.lastChallengeDate = today;
        user.lastActiveDate = today;
      } else if (lastChallenge === today) {
        if (!user.streakDays || user.streakDays <= 0) {
          user.streakDays = 1;
        }
        user.lastActiveDate = today;
      } else {
        const daysSinceLastChallenge = this.getDaysDifference(lastChallenge, today);
        if (daysSinceLastChallenge === 1) {
          // Consecutive day challenge completion!
          user.streakDays = (user.streakDays || 0) + 1;
        } else {
          // Missed a day -> reset to 1 starting today
          user.streakDays = 1;
        }
        user.lastChallengeDate = today;
        user.lastActiveDate = today;
      }

      this.saveUser(user);
      notifyBadgeUnlocks(user.id, newlyUnlocked);

      this.addGardenExp(sub.awardedPoints);

      const communities = this.getCommunities();
      const userComm = communities.find((c) => c.id === user.communityId);
      if (userComm) {
        userComm.totalPoints += sub.awardedPoints;
        userComm.actionCount += 1;
        if (sub.impact.trees > 0) {
          userComm.treesPlanted += sub.impact.trees;
        }
        this.saveCommunities(communities);
      }
    }
  }

  static updateSubmissionReview(id: string, verdict: 'valid' | 'tidak_valid', reviewerName: string): void {
    const list = this.getSubmissions();
    const sub = list.find((s) => s.id === id);
    if (sub) {
      const prevVerdict = sub.verdict;
      sub.verdict = verdict;
      sub.reviewedBy = reviewerName;
      this.saveSubmissions(list);

      if (verdict === 'valid' && prevVerdict !== 'valid') {
        const user = this.getUser();
        if (sub.userId === user.id) {
          const newlyUnlocked = awardPoints(user, sub.awardedPoints);
          this.saveUser(user);
          notifyBadgeUnlocks(user.id, newlyUnlocked);
        }
        this.addGardenExp(sub.awardedPoints);
      }
    }
  }

  static isDuplicateImageHash(hash: string): boolean {
    const list = this.getSubmissions();
    return list.some((s) => s.imageHash === hash);
  }

  static getGardenState(): GardenState {
    const defaultGarden = this.getPreviewGarden();
    const savedGarden = this.getItem<GardenState>(STORAGE_KEYS.GARDEN, defaultGarden);
    if (savedGarden.level === 1 && savedGarden.currentExp === 45 && savedGarden.waterCount === 3) {
      this.saveGardenState(defaultGarden);
      return defaultGarden;
    }
    return savedGarden;
  }

  static saveGardenState(garden: GardenState): void {
    this.setItem<GardenState>(STORAGE_KEYS.GARDEN, garden);
  }

  static addGardenExp(exp: number): GardenState {
    const garden = this.getGardenState();
    garden.currentExp += exp;

    while (garden.currentExp >= garden.neededExp) {
      garden.currentExp -= garden.neededExp;
      garden.level += 1;
      garden.neededExp = Math.round(garden.neededExp * 1.5);

      if (garden.level >= 8) {
        garden.stage = 'Kebun Rindang';
      } else if (garden.level >= 5) {
        garden.stage = 'Pohon Teduh';
      } else if (garden.level >= 3) {
        garden.stage = 'Tanaman Muda';
      } else {
        garden.stage = 'Tunas';
      }
    }

    this.saveGardenState(garden);
    return garden;
  }

  static waterPlant(): { garden: GardenState; message: string } {
    const garden = this.getGardenState();
    garden.waterCount += 1;
    garden.lastWatered = new Date().toISOString();
    this.saveGardenState(garden);
    this.addGardenExp(10);
    const updated = this.getGardenState();
    return {
      garden: updated,
      message: 'Tanaman segar disiram air sejuk Silindung! +10 EXP Hijau',
    };
  }

  static getReports(): EnvironmentalReport[] {
    return this.getItem<EnvironmentalReport[]>(STORAGE_KEYS.REPORTS, [])
      .filter((report) => !['rep-1', 'rep-2'].includes(report.id));
  }

  static saveReports(reports: EnvironmentalReport[]): void {
    this.setItem<EnvironmentalReport[]>(STORAGE_KEYS.REPORTS, reports);
    notifySharedDataChange('reports', reports);
  }

  static addReport(report: EnvironmentalReport): void {
    const list = this.getReports();
    list.unshift(report);
    this.saveReports(list);
  }

  static getEvents(): GreenEvent[] {
    return this.getItem<GreenEvent[]>(STORAGE_KEYS.EVENTS, [])
      .filter((event) => !['evt-1', 'evt-2', 'evt-3'].includes(event.id));
  }

  static saveEvents(events: GreenEvent[]): void {
    this.setItem<GreenEvent[]>(STORAGE_KEYS.EVENTS, events);
    notifySharedDataChange('events', events);
  }

  static toggleEventRegistration(eventId: string): void {
    const events = this.getEvents();
    const evt = events.find((e) => e.id === eventId);
    if (evt) {
      evt.isRegistered = !evt.isRegistered;
      evt.registeredCount += evt.isRegistered ? 1 : -1;
      this.setItem(STORAGE_KEYS.EVENTS, events);
    }
  }

  static addEvent(newEvent: GreenEvent): void {
    const events = this.getEvents();
    events.unshift(newEvent);
    this.saveEvents(events);
  }

  static getMapLocations(): MapMarkerLocation[] {
    return this.getItem<MapMarkerLocation[]>(STORAGE_KEYS.LOCATIONS, [])
      .filter((location) => !/^loc-[1-6]$/.test(location.id));
  }

  static addMapLocation(loc: MapMarkerLocation): void {
    const list = this.getMapLocations();
    list.push(loc);
    this.saveMapLocations(list);
  }

  static saveMapLocations(locations: MapMarkerLocation[]): void {
    this.setItem(STORAGE_KEYS.LOCATIONS, locations);
    notifySharedDataChange('locations', locations);
  }

  static getThreads(): ThreadPost[] {
    return this.getItem<ThreadPost[]>(STORAGE_KEYS.THREADS, SEED_THREADS);
  }

  static saveThreads(threads: ThreadPost[]): void {
    this.setItem<ThreadPost[]>(STORAGE_KEYS.THREADS, threads);
    notifySharedDataChange('threads', threads);
  }

  static addThread(thread: ThreadPost): void {
    const list = this.getThreads();
    const updated = [thread, ...list];
    this.saveThreads(updated);
  }

  static toggleLikeThread(threadId: string, userId: string): void {
    const list = this.getThreads();
    const updated = list.map((thread) => {
      if (thread.id !== threadId) return thread;
      const likedBy = thread.likedBy || [];
      const hasLiked = likedBy.includes(userId);
      const newLikedBy = hasLiked ? likedBy.filter((id) => id !== userId) : [...likedBy, userId];
      return {
        ...thread,
        likes: hasLiked ? Math.max(0, thread.likes - 1) : thread.likes + 1,
        likedBy: newLikedBy,
      };
    });
    this.saveThreads(updated);
  }

  static addThreadReply(threadId: string, reply: ThreadReply): void {
    const list = this.getThreads();
    const updated = list.map((thread) => {
      if (thread.id !== threadId) return thread;
      const replies = thread.replies || [];
      return {
        ...thread,
        replies: [...replies, reply],
      };
    });
    this.saveThreads(updated);
  }

  static deleteThread(threadId: string): void {
    const list = this.getThreads();
    const updated = list.filter((thread) => thread.id !== threadId);
    this.saveThreads(updated);
  }

  static updateThreadStatus(threadId: string, status: 'aktif' | 'ditindaklanjuti' | 'selesai'): void {
    const list = this.getThreads();
    const updated = list.map((thread) => thread.id === threadId ? { ...thread, status } : thread);
    this.saveThreads(updated);
  }

  static applySharedSnapshot(collection: SharedCollection, data: unknown): void {
    switch (collection) {
      case 'brand':
        this.setItem<BrandSettings>(STORAGE_KEYS.BRAND, data as BrandSettings);
        window.dispatchEvent(new CustomEvent('mh-brand-updated', { detail: data }));
        break;
      case 'challenges':
        this.setItem<Challenge[]>(STORAGE_KEYS.CHALLENGES, data as Challenge[]);
        window.dispatchEvent(new CustomEvent('mh-data-updated', { detail: { collection: 'challenges' } }));
        break;
      case 'communities':
        this.setItem<Community[]>(STORAGE_KEYS.COMMUNITIES, data as Community[]);
        window.dispatchEvent(new CustomEvent('mh-data-updated', { detail: { collection: 'communities' } }));
        break;
      case 'devotions':
        this.setItem<Devotion[]>(STORAGE_KEYS.DEVOTIONS, data as Devotion[]);
        window.dispatchEvent(new CustomEvent('mh-data-updated', { detail: { collection: 'devotions' } }));
        break;
      case 'events':
        this.setItem<GreenEvent[]>(STORAGE_KEYS.EVENTS, data as GreenEvent[]);
        window.dispatchEvent(new CustomEvent('mh-data-updated', { detail: { collection: 'events' } }));
        break;
      case 'locations':
        this.setItem<MapMarkerLocation[]>(STORAGE_KEYS.LOCATIONS, data as MapMarkerLocation[]);
        window.dispatchEvent(new CustomEvent('mh-data-updated', { detail: { collection: 'locations' } }));
        break;
      case 'reports':
        this.setItem<EnvironmentalReport[]>(STORAGE_KEYS.REPORTS, data as EnvironmentalReport[]);
        window.dispatchEvent(new CustomEvent('mh-data-updated', { detail: { collection: 'reports' } }));
        break;
      case 'threads':
        this.setItem<ThreadPost[]>(STORAGE_KEYS.THREADS, data as ThreadPost[]);
        window.dispatchEvent(new CustomEvent('mh-data-updated', { detail: { collection: 'threads' } }));
        break;
    }
  }

  static getUserImpact(user: User = this.getUser()) {
    const subs = this.getSubmissions().filter((s) => s.userId === user.id && s.verdict === 'valid');

    let totalWasteKg = 0;
    let totalTrees = 0;
    let totalWaterLiters = 0;
    let totalElectricityKwh = 0;

    for (const s of subs) {
      totalWasteKg += s.impact.wasteKg || 0;
      totalTrees += s.impact.trees || 0;
      totalWaterLiters += s.impact.waterLiters || 0;
      totalElectricityKwh += s.impact.electricityKwh || 0;
    }

    return {
      wasteKg: parseFloat(totalWasteKg.toFixed(2)),
      trees: totalTrees,
      waterLiters: Math.round(totalWaterLiters),
      electricityKwh: parseFloat(totalElectricityKwh.toFixed(1)),
      submissionsCount: subs.length,
      points: user.points,
    };
  }

  static exportUserData(): string {
    const data = {
      user: this.getUser(),
      submissions: this.getSubmissions().filter((s) => s.userId === this.getUser().id),
      garden: this.getGardenState(),
      reports: this.getReports().filter((r) => r.reportedBy === this.getUser().name),
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  }

  static resetAllData(): void {
    localStorage.clear();
  }
}
