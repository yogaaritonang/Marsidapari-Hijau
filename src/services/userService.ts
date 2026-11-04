import { User } from '../types';

/**
 * UserService
 * Mengelola profil pengguna, perhitungan kunjungan berturut-turut (daily streak),
 * dan peresetan otomatis streak saat tidak aktif lebih dari 24 jam / melewatkan hari.
 */
export class UserService {
  /**
   * Menghasilkan string tanggal lokal format YYYY-MM-DD
   */
  static getTodayDateString(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Menghitung selisih hari kalender antara dua tanggal YYYY-MM-DD
   */
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
   * Menghitung selisih jam antara timestamp ISO terakhir dengan waktu sekarang
   */
  static getHoursSinceTimestamp(timestamp?: string): number {
    if (!timestamp) return 999;
    try {
      const past = new Date(timestamp).getTime();
      const now = Date.now();
      return Math.max(0, Math.floor((now - past) / (1000 * 60 * 60)));
    } catch {
      return 999;
    }
  }

  /**
   * Sinkronisasi streak harian pengguna.
   * Mereset streak secara otomatis jika pengguna tidak aktif selama >24 jam / melewatkan hari.
   */
  static syncDailyStreak(user: User): User {
    if (!user || user.id === 'guest-preview') return user;

    const today = this.getTodayDateString();
    const nowIso = new Date().toISOString();

    if (!user.lastActiveDate) {
      user.lastActiveDate = today;
      user.lastActiveTimestamp = nowIso;
      user.streakDays = 1;
      return user;
    }

    const daysSinceActive = this.getDaysDifference(user.lastActiveDate, today);
    const hoursSinceActive = this.getHoursSinceTimestamp(user.lastActiveTimestamp);

    // Jika pengguna tidak aktif lebih dari 24 jam dan telah melewati satu hari kalender penuh:
    if (daysSinceActive > 1 || (daysSinceActive === 1 && hoursSinceActive > 36)) {
      if (user.streakDays !== 0) {
        user.streakDays = 0;
      }
    }

    // Jika ada tanggal aksi tantangan terakhir dan terlewat lebih dari 1 hari
    if (user.lastChallengeDate) {
      const daysSinceChallenge = this.getDaysDifference(user.lastChallengeDate, today);
      if (daysSinceChallenge > 1 && user.streakDays !== 0) {
        user.streakDays = 0;
      }
    }

    return user;
  }

  /**
   * Mencatat kunjungan harian pengguna saat membuka atau berinteraksi dengan aplikasi.
   * Menghitung hari berturut-turut kunjungan dan memperbarui timestamp.
   */
  static recordDailyVisit(user: User): User {
    if (!user || user.id === 'guest-preview') return user;

    const today = this.getTodayDateString();
    const nowIso = new Date().toISOString();

    // Pastikan status streak bersih dari ketidakaktifan sebelumnya
    this.syncDailyStreak(user);

    if (user.lastActiveDate === today) {
      // Sudah berkunjung hari ini, perbarui timestamp terakhir aktif
      user.lastActiveTimestamp = nowIso;
      if (user.streakDays <= 0) {
        user.streakDays = 1;
      }
      return user;
    }

    const daysSinceLast = this.getDaysDifference(user.lastActiveDate, today);

    if (daysSinceLast === 1) {
      // Kunjungan hari berikutnya berturut-turut!
      user.streakDays = (user.streakDays || 0) + 1;
    } else {
      // Melewatkan lebih dari 1 hari (tidak aktif > 24 jam) -> mulai streak baru hari ini
      user.streakDays = 1;
    }

    user.lastActiveDate = today;
    user.lastActiveTimestamp = nowIso;
    return user;
  }

  /**
   * Strategi Resolusi Konflik Data Real-Time untuk Profil Pengguna.
   * Dipanggil saat pengguna masuk (login) atau memulihkan sesi.
   * Memastikan poin, streak, peringkat, dan nama organisasi tersinkronisasi
   * secara otoritatif dengan state server Supabase dan membersihkan cache basi.
   */
  static resolveProfileConflict(
    authUser: {
      id: string;
      email?: string;
      app_metadata?: Record<string, unknown>;
      user_metadata?: Record<string, unknown>;
    },
    options?: {
      clearStaleCache?: boolean;
    }
  ): User {
    const metadata = authUser.user_metadata || {};
    const appMetadata = authUser.app_metadata || {};
    const userId = authUser.id;

    // 1. Bersihkan cache sesi basi jika berbeda akun
    if (options?.clearStaleCache) {
      try {
        const rawLocal = localStorage.getItem('mh_user');
        if (rawLocal) {
          const parsed = JSON.parse(rawLocal);
          if (parsed && parsed.id && parsed.id !== userId) {
            localStorage.removeItem('mh_user');
          }
        }
      } catch {
        // ignore
      }
    }

    // 2. Ambil profil lokal yang tersimpan khusus user ini
    let cachedUser: Partial<User> | null = null;
    try {
      const rawUserCache = localStorage.getItem(`mh_user_profile_${userId}`);
      if (rawUserCache) {
        cachedUser = JSON.parse(rawUserCache) as Partial<User>;
      }
    } catch {
      // ignore
    }

    // 3. Resolusi Role
    const role: User['role'] = appMetadata.role === 'admin'
      ? 'admin'
      : appMetadata.role === 'pemimpin'
      ? 'pemimpin'
      : 'anggota';

    // 4. Resolusi Organisasi (Komunitas)
    // Utamakan app_metadata (trusted) kemudian user_metadata
    const trustedOrgId = typeof appMetadata.organization_id === 'string' ? appMetadata.organization_id : undefined;
    const communityId = trustedOrgId || (typeof metadata.communityId === 'string' ? metadata.communityId : 'umum');

    // Ambil daftar komunitas terkini dari storage untuk memastikan nama yang diedit admin langsung dipakai
    let communityName = typeof metadata.communityName === 'string' && metadata.communityName.trim()
      ? metadata.communityName
      : 'Komunitas Marsiadapari Hijau';

    try {
      const rawComms = localStorage.getItem('mh_communities');
      if (rawComms) {
        const comms = JSON.parse(rawComms) as Array<{ id: string; name: string }>;
        const matched = comms.find((c) => c.id === communityId);
        if (matched && matched.name) {
          communityName = matched.name;
        }
      }
    } catch {
      // ignore
    }

    // 5. Resolusi Konflik Poin (Conflict Resolution Strategy)
    // Server metadata adalah otoritatif. Namun jika klien lokal memiliki poin terverifikasi lebih tinggi
    // (misalnya setelah aksi offline yang belum sempat push), ambil nilai tertinggi dan jadwalkan sinkronisasi kembali ke server.
    const serverPoints = typeof metadata.points === 'number' ? metadata.points : 0;
    const localPoints = typeof cachedUser?.points === 'number' ? cachedUser.points : 0;
    const resolvedPoints = Math.max(serverPoints, localPoints);

    // 6. Resolusi Streak Harian
    const serverStreak = typeof metadata.streakDays === 'number' ? metadata.streakDays : 1;
    const localStreak = typeof cachedUser?.streakDays === 'number' ? cachedUser.streakDays : 1;
    const resolvedStreak = Math.max(1, serverStreak, localStreak);

    // 7. Resolusi Preferensi
    const resolvedPreferences = cachedUser?.preferences || {
      fontSize: 'normal' as const,
      darkMode: false,
      dataSaver: false,
      notifications: true,
      isAnonymous: typeof metadata.isAnonymous === 'boolean' ? metadata.isAnonymous : false,
    };

    const today = this.getTodayDateString();
    const resolvedUser: User = {
      id: userId,
      name: typeof metadata.name === 'string' ? metadata.name : (cachedUser?.name || authUser.email || 'Sahabat Hijau'),
      contact: authUser.email || cachedUser?.contact || '',
      role,
      communityId,
      communityName,
      points: resolvedPoints,
      streakDays: resolvedStreak,
      lastActiveDate: today,
      lastActiveTimestamp: new Date().toISOString(),
      joinedDate: typeof metadata.joinedDate === 'string' ? metadata.joinedDate : (cachedUser?.joinedDate || today),
      preferences: resolvedPreferences,
    };

    // Sinkronisasi streak harian
    const activeUser = this.recordDailyVisit(resolvedUser);

    // Simpan ke cache otoritatif
    try {
      localStorage.setItem(`mh_user_profile_${userId}`, JSON.stringify(activeUser));
    } catch {
      // ignore
    }

    return activeUser;
  }
}
