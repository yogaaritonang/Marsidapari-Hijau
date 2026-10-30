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
   * Mendapatkan status dan informasi streak pengguna
   */
  static getStreakStatus(user: User): {
    streakDays: number;
    isActive: boolean;
    visitedToday: boolean;
    hoursInactive: number;
    statusText: string;
  } {
    if (!user || user.id === 'guest-preview') {
      return {
        streakDays: 0,
        isActive: false,
        visitedToday: false,
        hoursInactive: 0,
        statusText: 'Mode Pengunjung',
      };
    }

    const today = this.getTodayDateString();
    const visitedToday = user.lastActiveDate === today;
    const hoursInactive = this.getHoursSinceTimestamp(user.lastActiveTimestamp);
    const isActive = user.streakDays > 0;

    let statusText = 'Mulai Aksi Hari Ini';
    if (isActive) {
      statusText = `${user.streakDays} Hari Berturut-turut 🔥`;
    } else if (hoursInactive >= 24) {
      statusText = 'Streak Ter-reset (Tidak aktif >24 jam)';
    }

    return {
      streakDays: user.streakDays || 0,
      isActive,
      visitedToday,
      hoursInactive,
      statusText,
    };
  }
}
