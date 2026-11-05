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
  EcotheologyArticle,
} from '../types';
import {
  SEED_COMMUNITIES,
  SEED_DEVOTIONS,
  SEED_CHALLENGES,
  SEED_LOCATIONS,
  SEED_EVENTS,
  SEED_THREADS,
  SEED_ECOTHEOLOGY,
} from '../data/seedData';
import { POINT_BADGES } from '../data/badges';
import { UserService } from './userService';
import { PushNotificationService } from './pushNotificationService';

const CIPHER_KEY = 'marsiadapari-hijau-iakn-toba-2026';

function encryptData(raw: string): string {
  // Store raw JSON directly to prevent base64 logo and image data corruption
  return raw;
}

function decryptData(cipher: string): string {
  if (!cipher) return cipher;
  if (!cipher.startsWith('enc_')) return cipher;
  try {
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
  ECOTHEOLOGY: 'mh_ecotheology',
};
let applyingPersistentUserSnapshot = false;
let cloudProfileSyncReady = false;

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

type SharedCollection = 'brand' | 'challenges' | 'communities' | 'devotions' | 'events' | 'locations' | 'reports' | 'threads' | 'ecotheology';

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
  launchScreen: {
    enabled: true,
    title: 'Marsiadapari Hijau',
    subtitle: 'Gerakan Ekoteologi & Keberlanjutan Alam Toba',
    verseText: 'TUHAN Allah mengambil manusia itu dan menempatkannya dalam taman Eden untuk mengusahakan dan memelihara taman itu.',
    verseRef: 'Kejadian 2:15',
    logoUrl: '',
    bgGradient: 'from-emerald-950 via-[#1B3F23] to-[#0D2413]',
    durationMs: 2500,
  },
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
  static applyUserDataReset(userId: string, resetAt: string): void {
    const resetMarkerKey = `mh_data_reset_${userId}`;
    if (localStorage.getItem(resetMarkerKey) === resetAt) return;

    const cachedUser = this.getCachedUser();
    if (cachedUser.id === userId) localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(`mh_user_profile_${userId}`);
    localStorage.removeItem(`mh_pending_badges_${userId}`);
    localStorage.removeItem(`mh_deleted_threads_${userId}`);

    this.setItem<ChallengeSubmission[]>(
      STORAGE_KEYS.SUBMISSIONS,
      this.getSubmissions().filter((submission) => submission.userId !== userId),
    );
    this.setItem<ThreadPost[]>(
      STORAGE_KEYS.THREADS,
      this.getThreads()
        .filter((thread) => thread.userId !== userId)
        .map((thread) => {
          const likedBy = thread.likedBy?.filter((id) => id !== userId);
          return {
            ...thread,
            ...(likedBy ? { likedBy, likes: likedBy.length } : {}),
            savedBy: thread.savedBy?.filter((id) => id !== userId),
            replies: thread.replies?.filter((reply) => reply.userId !== userId),
          };
        }),
    );
    this.setItem<EnvironmentalReport[]>(
      STORAGE_KEYS.REPORTS,
      this.getItem<EnvironmentalReport[]>(STORAGE_KEYS.REPORTS, [])
        .filter((report) => report.userId !== userId),
    );
    this.setItem<MapMarkerLocation[]>(
      STORAGE_KEYS.LOCATIONS,
      this.getItem<MapMarkerLocation[]>(STORAGE_KEYS.LOCATIONS, SEED_LOCATIONS)
        .filter((location) => location.submittedBy !== userId),
    );

    try {
      const notifications = JSON.parse(localStorage.getItem('mh_notifications') || '[]') as Array<{
        recipientUserId?: string;
        senderUserId?: string;
      }>;
      localStorage.setItem(
        'mh_notifications',
        JSON.stringify(notifications.filter((item) => item.recipientUserId !== userId && item.senderUserId !== userId)),
      );
    } catch {
      localStorage.removeItem('mh_notifications');
    }

    localStorage.removeItem('mh_leaderboard_cheers');
    localStorage.removeItem(STORAGE_KEYS.GARDEN);
    this.setItem(
      STORAGE_KEYS.DEVOTIONS,
      this.getDevotions().map((devotion) => ({ ...devotion, isFavorite: false })),
    );
    localStorage.setItem(resetMarkerKey, resetAt);
    cloudProfileSyncReady = false;
  }

  static isThreadDeletedLocally(userId: string, threadId: string): boolean {
    const deletedIds = this.getItem<string[]>(`mh_deleted_threads_${userId}`, []);
    return deletedIds.includes(threadId);
  }

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

  static getCachedUser(): User {
    return this.getItem<User>(STORAGE_KEYS.USER, DEFAULT_USER);
  }

  static saveUser(user: User): void {
    const previousUser = this.getCachedUser();
    if (previousUser.id !== user.id) cloudProfileSyncReady = false;
    this.setItem<User>(STORAGE_KEYS.USER, user);
    if (user && user.id && user.id !== 'guest-preview') {
      try {
        localStorage.setItem(`mh_user_profile_${user.id}`, JSON.stringify(user));
      } catch {
        // ignore
      }
      if (!applyingPersistentUserSnapshot && cloudProfileSyncReady) {
        void import('./persistentDataService')
          .then(({ PersistentDataService }) => PersistentDataService.saveUserProfile(user))
          .catch((error: unknown) => {
            const message = error instanceof Error ? error.message : 'Profil gagal disimpan ke Supabase.';
            window.dispatchEvent(new CustomEvent('mh-shared-sync-status', {
              detail: { state: 'error', message },
            }));
            console.error('[StorageService] Gagal menyimpan profil cloud:', error);
          });
      }
    }
  }

  static applyPersistentUserSnapshot(user: User, garden: GardenState | null): void {
    applyingPersistentUserSnapshot = true;
    try {
      cloudProfileSyncReady = true;
      this.setItem<User>(STORAGE_KEYS.USER, user);
      this.setItem<GardenState>(STORAGE_KEYS.GARDEN, garden || this.getPreviewGarden());
      localStorage.setItem(`mh_user_profile_${user.id}`, JSON.stringify(user));
      window.dispatchEvent(new CustomEvent('mh-user-updated', { detail: user }));
    } finally {
      applyingPersistentUserSnapshot = false;
    }
  }

  static applyAuthUserSnapshot(user: User): void {
    this.setItem<User>(STORAGE_KEYS.USER, user);
    if (user.id && user.id !== 'guest-preview') {
      try {
        localStorage.setItem(`mh_user_profile_${user.id}`, JSON.stringify(user));
      } catch {
        // The authenticated profile is still retained in the primary app cache.
      }
    }
    window.dispatchEvent(new CustomEvent('mh-user-updated', { detail: user }));
  }

  static resetPersistentSync(): void {
    cloudProfileSyncReady = false;
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
    const brand = this.getItem<BrandSettings>(STORAGE_KEYS.BRAND, DEFAULT_BRAND);
    // If brand is missing logoUrl but backup has it, restore from backup
    if (!brand.logoUrl) {
      try {
        const backupRaw = localStorage.getItem('mh_brand_backup');
        if (backupRaw) {
          const parsed = JSON.parse(backupRaw) as BrandSettings;
          if (parsed && parsed.logoUrl) {
            brand.logoUrl = parsed.logoUrl;
          }
        }
      } catch {
        // ignore
      }
    }
    return brand;
  }

  static saveBrandSettings(settings: BrandSettings): void {
    this.setItem<BrandSettings>(STORAGE_KEYS.BRAND, settings);
    try {
      localStorage.setItem('mh_brand_backup', JSON.stringify(settings));
    } catch {
      // ignore
    }
    notifySharedDataChange('brand', [{ id: 'global', ...settings }]);
    window.dispatchEvent(new CustomEvent('mh-brand-updated', { detail: settings }));
  }

  static getCommunities(): Community[] {
    const list = this.getItem<Community[]>(STORAGE_KEYS.COMMUNITIES, SEED_COMMUNITIES);
    if (!list || list.length === 0) {
      this.saveCommunities(SEED_COMMUNITIES);
    }
    // Ensure all seed communities exist in the list
    let updated = false;
    const merged = [...(list && list.length > 0 ? list : SEED_COMMUNITIES)];
    for (const seed of SEED_COMMUNITIES) {
      if (!merged.some((c) => c.id === seed.id)) {
        merged.push(seed);
        updated = true;
      }
    }
    if (updated) {
      this.saveCommunities(merged);
    }
    const activityByCommunity = new Map<string, { points: number; actions: number; trees: number }>();
    for (const submission of this.getSubmissions()) {
      if (submission.verdict !== 'valid') continue;
      const community = merged.find((item) =>
        (submission.userCommunityId && item.id === submission.userCommunityId) ||
        (submission.userCommunity && (item.id === submission.userCommunity || item.name === submission.userCommunity))
      );
      if (!community) continue;
      const activity = activityByCommunity.get(community.id) || { points: 0, actions: 0, trees: 0 };
      activity.points += submission.awardedPoints;
      activity.actions += 1;
      activity.trees += submission.impact?.trees || 0;
      activityByCommunity.set(community.id, activity);
    }
    return merged.map((community) => {
      const activity = activityByCommunity.get(community.id) || { points: 0, actions: 0, trees: 0 };
      return {
        ...community,
        verifiedPoints: activity.points,
        verifiedActions: activity.actions,
        verifiedTrees: activity.trees,
      };
    });
  }

  static saveCommunities(communities: Community[]): void {
    const storedCommunities = communities.map(({ verifiedPoints: _points, verifiedActions: _actions, verifiedTrees: _trees, ...community }) => community);
    this.setItem<Community[]>(STORAGE_KEYS.COMMUNITIES, storedCommunities);
    notifySharedDataChange('communities', storedCommunities);
    window.dispatchEvent(new CustomEvent('mh-data-updated', { detail: { collection: 'communities', values: storedCommunities } }));
  }

  static getRegisteredMemberCount(communityId: string): number {
    const counts = this.getItem<Record<string, number>>('mh_registered_community_member_counts', {});
    return Math.max(0, counts[communityId] || 0);
  }

  static getCommunityMemberCount(community: Community): number {
    return community.memberCount + this.getRegisteredMemberCount(community.id);
  }

  static applyRegisteredMemberCounts(counts: Record<string, number>): void {
    const normalized = Object.fromEntries(
      Object.entries(counts).filter(([, count]) => Number.isFinite(count) && count >= 0),
    );
    this.setItem<Record<string, number>>('mh_registered_community_member_counts', normalized);
    window.dispatchEvent(new CustomEvent('mh-data-updated', { detail: { collection: 'communities' } }));
  }

  static applyEventRegistrationSnapshot(
    counts: Map<string, number>,
    registeredEventIds: Set<string>,
  ): void {
    const events = this.getEvents().map((event) => ({
      ...event,
      registeredCount: counts.get(event.id) || 0,
      isRegistered: registeredEventIds.has(event.id),
    }));
    this.setItem<GreenEvent[]>(STORAGE_KEYS.EVENTS, events);
    window.dispatchEvent(new CustomEvent('mh-data-updated', {
      detail: { collection: 'events', values: events },
    }));
  }

  static reconcileUserPoints(user: User): User {
    const verifiedPoints = this.getSubmissions()
      .filter((submission) => submission.userId === user.id && submission.verdict === 'valid')
      .reduce((total, submission) => total + submission.awardedPoints, 0);
    if (verifiedPoints === user.points) return user;
    const updated = { ...user, points: verifiedPoints };
    this.saveUser(updated);
    return updated;
  }

  static addCommunity(community: Community): void {
    const list = this.getCommunities();
    const existingIndex = list.findIndex((c) => c.id === community.id);
    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...community };
    } else {
      list.push(community);
    }
    this.saveCommunities(list);
  }

  static updateCommunity(updated: Community): void {
    const list = this.getCommunities();
    const existingIndex = list.findIndex((c) => c.id === updated.id);
    let oldName = '';
    if (existingIndex >= 0) {
      oldName = list[existingIndex].name;
      list[existingIndex] = { ...list[existingIndex], ...updated };
    } else {
      list.push(updated);
    }
    this.saveCommunities(list);

    // Jika pengguna yang aktif terafiliasi dengan komunitas ini, perbarui nama komunitasnya seketika
    const currentUser = this.getUser();
    if (
      currentUser &&
      (currentUser.communityId === updated.id ||
        (oldName && currentUser.communityName === oldName))
    ) {
      currentUser.communityId = updated.id;
      currentUser.communityName = updated.name;
      this.saveUser(currentUser);
      window.dispatchEvent(new CustomEvent('mh-user-updated', { detail: currentUser }));
    }
  }

  static deleteCommunity(id: string): void {
    const list = this.getCommunities().filter((c) => c.id !== id);
    this.saveCommunities(list);
  }

  static updateChallenge(challenge: Challenge): void {
    const list = this.getChallenges();
    const existingIndex = list.findIndex((c) => c.id === challenge.id);
    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...challenge };
    } else {
      list.push(challenge);
    }
    this.saveChallenges(list);
    window.dispatchEvent(new CustomEvent('mh-data-updated', { detail: { collection: 'challenges', values: list } }));
  }

  static deleteChallenge(id: string): void {
    const list = this.getChallenges().filter((c) => c.id !== id);
    this.saveChallenges(list);
    window.dispatchEvent(new CustomEvent('mh-data-updated', { detail: { collection: 'challenges', values: list } }));
  }

  /**
   * Menghitung total pohon tertanam secara dinamis untuk komunitas pengguna atau seluruh gerakan
   * Tersinkronisasi dengan aksi/challenge yang telah diselesaikan dan diverifikasi.
   */
  static getCommunityTotalTrees(communityId?: string): number {
    const comms = this.getCommunities();
    const targetComm = comms.find((c) => c.id === communityId) || comms[0];

    // Hitung pohon tambahan dari submission aksi yang berstatus valid
    const subs = this.getSubmissions().filter((submission) =>
      submission.verdict === 'valid' &&
      (!communityId ||
        submission.userCommunityId === communityId ||
        submission.userCommunity === communityId ||
        submission.userCommunity === targetComm?.name)
    );
    let extraTrees = 0;
    for (const sub of subs) {
      if (sub.impact && sub.impact.trees > 0) {
        extraTrees += sub.impact.trees;
      }
    }

    const baseline = targetComm?.treesPlanted || 120;
    return baseline + extraTrees;
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
      this.setItem<Devotion[]>(STORAGE_KEYS.DEVOTIONS, list);
      window.dispatchEvent(new CustomEvent('mh-data-updated', { detail: { collection: 'devotions' } }));
      void import('./persistentDataService')
        .then(({ PersistentDataService }) => PersistentDataService.saveFavoriteDevotions(
          list.filter((devotion) => devotion.isFavorite).map((devotion) => devotion.id),
        ))
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : 'Renungan favorit gagal disimpan.';
          window.dispatchEvent(new CustomEvent('mh-shared-sync-status', {
            detail: { state: 'error', message },
          }));
          console.error('[StorageService] Gagal menyimpan renungan favorit:', error);
        });
    }
  }

  static applyFavoriteDevotions(ids: string[]): void {
    const favorites = new Set(ids);
    const devotions = this.getDevotions().map((devotion) => ({
      ...devotion,
      isFavorite: favorites.has(devotion.id),
    }));
    this.setItem<Devotion[]>(STORAGE_KEYS.DEVOTIONS, devotions);
    window.dispatchEvent(new CustomEvent('mh-data-updated', { detail: { collection: 'devotions' } }));
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
    window.dispatchEvent(new CustomEvent('mh-leaderboard-updated', { detail: submissions }));
    window.dispatchEvent(new CustomEvent('mh-data-updated', { detail: { collection: 'submissions', values: submissions } }));
  }

  static addSubmission(sub: ChallengeSubmission): void {
    const activeUser = this.getUser();
    const submission = sub.userId === activeUser.id && activeUser.id !== 'guest-preview'
      ? {
          ...sub,
          userCommunity: sub.userCommunity || activeUser.communityName,
          userCommunityId: sub.userCommunityId || activeUser.communityId,
        }
      : sub;
    const list = this.getSubmissions();
    if (list.some((item) => item.id === submission.id)) return;
    list.unshift(submission);
    this.saveSubmissions(list);

    if (submission.verdict === 'valid') {
      const user = this.getUser();
      const newlyUnlocked = awardPoints(user, submission.awardedPoints);

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

      // Async sync points to auth metadata so they persist across sessions
      if (typeof window !== 'undefined' && user.id !== 'guest-preview') {
        import('./authService').then(({ AuthService }) => {
          AuthService.updateProfileMetadata({
            points: user.points,
            streakDays: user.streakDays,
            lastChallengeDate: user.lastChallengeDate,
          }).catch((error: unknown) => console.warn('[StorageService] Gagal menyimpan poin akun:', error));
        }).catch((error: unknown) => console.warn('[StorageService] Tidak dapat memperbarui poin akun:', error));
      }

      this.addGardenExp(submission.awardedPoints);

      window.dispatchEvent(new CustomEvent('mh-data-updated', { detail: { collection: 'communities' } }));
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
          if (typeof window !== 'undefined' && user.id !== 'guest-preview') {
            import('./authService').then(({ AuthService }) => {
              AuthService.updateProfileMetadata({
                points: user.points,
                streakDays: user.streakDays,
              }).catch((error: unknown) => console.warn('[StorageService] Gagal menyimpan poin akun:', error));
            }).catch((error: unknown) => console.warn('[StorageService] Tidak dapat memperbarui poin akun:', error));
          }
        }
        this.addGardenExp(sub.awardedPoints);

        window.dispatchEvent(new CustomEvent('mh-data-updated', { detail: { collection: 'communities' } }));

        // Trigger Service Worker Push Notification untuk bukti yang disetujui
        PushNotificationService.notifySubmissionApproved({
          challengeTitle: sub.challengeTitle,
          awardedPoints: sub.awardedPoints,
          userName: sub.userName,
        }).catch((err) => console.warn('[PushNotification] Error notifying submission approval:', err));
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
    void import('./persistentDataService')
      .then(({ PersistentDataService }) => PersistentDataService.saveGarden(garden))
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Progres kebun gagal disimpan ke Supabase.';
        window.dispatchEvent(new CustomEvent('mh-shared-sync-status', {
          detail: { state: 'error', message },
        }));
        console.error('[StorageService] Gagal menyimpan progres kebun:', error);
      });
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
    const list = this.getItem<GreenEvent[]>(STORAGE_KEYS.EVENTS, SEED_EVENTS);
    if (!list || list.length === 0) {
      this.saveEvents(SEED_EVENTS);
      return SEED_EVENTS;
    }
    // Ensure all seed events exist
    let updated = false;
    const merged = [...list];
    for (const seed of SEED_EVENTS) {
      if (!merged.some((e) => e.id === seed.id)) {
        merged.push(seed);
        updated = true;
      }
    }
    if (updated) {
      this.saveEvents(merged);
    }
    return merged;
  }

  static saveEvents(events: GreenEvent[]): void {
    this.setItem<GreenEvent[]>(STORAGE_KEYS.EVENTS, events);
    notifySharedDataChange('events', events);
    window.dispatchEvent(new CustomEvent('mh-data-updated', { detail: { collection: 'events', values: events } }));
  }

  static toggleEventRegistration(eventId: string): void {
    void import('./persistentDataService')
      .then(({ PersistentDataService }) => PersistentDataService.toggleEventRegistration(eventId))
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Pendaftaran kegiatan gagal disimpan.';
        window.dispatchEvent(new CustomEvent('mh-shared-sync-status', {
          detail: { state: 'error', message },
        }));
        console.error('[StorageService] Gagal menyimpan pendaftaran kegiatan:', error);
      });
  }

  static addEvent(newEvent: GreenEvent): void {
    const events = this.getEvents();
    events.unshift(newEvent);
    this.saveEvents(events);
  }

  static updateEvent(updated: GreenEvent): void {
    const events = this.getEvents();
    const index = events.findIndex((e) => e.id === updated.id);
    if (index >= 0) {
      events[index] = { ...events[index], ...updated };
    } else {
      events.unshift(updated);
    }
    this.saveEvents(events);
  }

  static deleteEvent(id: string): void {
    const events = this.getEvents().filter((e) => e.id !== id);
    this.saveEvents(events);
  }

  static getMapLocations(): MapMarkerLocation[] {
    const list = this.getItem<MapMarkerLocation[]>(STORAGE_KEYS.LOCATIONS, SEED_LOCATIONS);
    if (!list || list.length === 0) {
      this.saveMapLocations(SEED_LOCATIONS);
      return SEED_LOCATIONS;
    }
    // Ensure seed locations exist
    let updated = false;
    const merged = [...list];
    for (const seed of SEED_LOCATIONS) {
      if (!merged.some((l) => l.id === seed.id)) {
        merged.push(seed);
        updated = true;
      }
    }
    if (updated) {
      this.saveMapLocations(merged);
    }
    return merged;
  }

  static addMapLocation(loc: MapMarkerLocation): void {
    const list = this.getMapLocations();
    list.push(loc);
    this.saveMapLocations(list);
  }

  static saveMapLocations(locations: MapMarkerLocation[]): void {
    this.setItem(STORAGE_KEYS.LOCATIONS, locations);
    notifySharedDataChange('locations', locations);
    window.dispatchEvent(new CustomEvent('mh-data-updated', { detail: { collection: 'locations', values: locations } }));
  }

  static getThreads(): ThreadPost[] {
    const list = this.getItem<ThreadPost[]>(STORAGE_KEYS.THREADS, []);
    return Array.isArray(list) ? list.filter((t) => t && t.id && !t.id.startsWith('th-seed-')) : [];
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
      const likedBy = Array.isArray(thread.likedBy) ? thread.likedBy : [];
      const hasLiked = likedBy.includes(userId);
      const newLikedBy = hasLiked ? likedBy.filter((id) => id !== userId) : [...likedBy, userId];
      return {
        ...thread,
        likes: newLikedBy.length,
        likedBy: newLikedBy,
      };
    });
    this.saveThreads(updated);
  }

  static getEcotheologyArticles(): EcotheologyArticle[] {
    const list = this.getItem<EcotheologyArticle[]>(STORAGE_KEYS.ECOTHEOLOGY, SEED_ECOTHEOLOGY);
    // Ensure newly added seed articles like eco-ulos-1 are seamlessly included
    const ulosSeed = SEED_ECOTHEOLOGY.find((a) => a.id === 'eco-ulos-1');
    if (ulosSeed && !list.some((a) => a.id === 'eco-ulos-1')) {
      list.unshift(ulosSeed);
      this.setItem<EcotheologyArticle[]>(STORAGE_KEYS.ECOTHEOLOGY, list);
    }
    return list;
  }

  static saveEcotheologyArticles(articles: EcotheologyArticle[]): void {
    this.setItem<EcotheologyArticle[]>(STORAGE_KEYS.ECOTHEOLOGY, articles);
    notifySharedDataChange('ecotheology', articles);
    window.dispatchEvent(new CustomEvent('mh-ecotheology-updated', { detail: articles }));
    window.dispatchEvent(new CustomEvent('mh-data-updated', { detail: { collection: 'ecotheology' } }));
  }

  static saveEcotheologyArticle(article: EcotheologyArticle): void {
    const list = this.getEcotheologyArticles();
    const idx = list.findIndex((a) => a.id === article.id);
    if (idx >= 0) {
      list[idx] = article;
    } else {
      list.unshift(article);
    }
    this.saveEcotheologyArticles(list);
  }

  static deleteEcotheologyArticle(id: string): void {
    const list = this.getEcotheologyArticles();
    const updated = list.filter((a) => a.id !== id);
    this.saveEcotheologyArticles(updated);
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
    const userId = this.getCachedUser().id;
    if (userId && userId !== 'guest-preview') {
      const deletedIds = this.getItem<string[]>(`mh_deleted_threads_${userId}`, []);
      if (!deletedIds.includes(threadId)) {
        this.setItem(`mh_deleted_threads_${userId}`, [...deletedIds, threadId]);
      }
    }
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
      case 'ecotheology':
        this.setItem<EcotheologyArticle[]>(STORAGE_KEYS.ECOTHEOLOGY, data as EcotheologyArticle[]);
        window.dispatchEvent(new CustomEvent('mh-ecotheology-updated', { detail: data }));
        window.dispatchEvent(new CustomEvent('mh-data-updated', { detail: { collection: 'ecotheology' } }));
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
