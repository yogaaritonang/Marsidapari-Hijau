/**
 * Layanan Push Notification Service Worker untuk Marsiadapari Hijau
 * Menangani izin notifikasi sistem, pengiriman notifikasi lewat Service Worker,
 * serta notifikasi saat tantangan baru atau bukti tantangan diverifikasi admin.
 */

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
  tag?: string;
}

export class PushNotificationService {
  private static permissionRequested = false;

  /**
   * Cek apakah API Notification & Service Worker didukung di browser ini
   */
  static isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  /**
   * Status izin notifikasi saat ini ('granted', 'denied', atau 'default')
   */
  static getPermission(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  }

  /**
   * Minta izin notifikasi ke pengguna
   */
  static async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) return 'denied';
    try {
      this.permissionRequested = true;
      const permission = await Notification.requestPermission();
      return permission;
    } catch (e) {
      console.warn('[PushNotificationService] Izin notifikasi gagal diminta:', e);
      return 'denied';
    }
  }

  /**
   * Kirim notifikasi sistem melalui Service Worker (fallback ke window.Notification)
   */
  static async sendNotification(payload: NotificationPayload): Promise<boolean> {
    if (!this.isSupported()) return false;

    // Jika belum diizinkan, coba minta izin sekali secara otomatis
    if (Notification.permission === 'default' && !this.permissionRequested) {
      const granted = await this.requestPermission();
      if (granted !== 'granted') return false;
    } else if (Notification.permission !== 'granted') {
      return false;
    }

    const options: NotificationOptions & { vibrate?: number[] } = {
      body: payload.body,
      icon: payload.icon || '/pwa-192x192.png',
      badge: payload.badge || '/pwa-192x192.png',
      tag: payload.tag || 'mh-notification',
      data: payload.data || { url: '/' },
      vibrate: [150, 80, 150],
    };

    try {
      // Prioritaskan pemanggilan via Service Worker registration
      if ('serviceWorker' in navigator) {
        const swReadyPromise = navigator.serviceWorker.ready;
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1200));
        const registration = await Promise.race([swReadyPromise, timeoutPromise]);

        if (registration && typeof registration.showNotification === 'function') {
          await registration.showNotification(payload.title, options);
          return true;
        }
      }

      // Fallback untuk browser yang mendukung Notification tetapi SW registration belum siap
      if (typeof Notification !== 'undefined') {
        const notification = new Notification(payload.title, options);
        notification.onclick = () => {
          window.focus();
          const targetUrl = (payload.data?.url as string) || '/';
          if (targetUrl && window.location.pathname + window.location.search !== targetUrl) {
            window.location.href = targetUrl;
          }
          notification.close();
        };
        return true;
      }
    } catch (error) {
      console.warn('[PushNotificationService] Gagal menampilkan notifikasi:', error);
    }

    return false;
  }

  /**
   * Notifikasi saat ada Tantangan Gotong Royong baru ditambahkan oleh admin
   */
  static async notifyNewChallenge(challenge: {
    title: string;
    points?: number;
    category?: string;
    targetCommunity?: string;
  }): Promise<boolean> {
    const pointsText = challenge.points ? ` (+${challenge.points} Poin Hijau)` : '';
    const commText = challenge.targetCommunity && challenge.targetCommunity !== 'Semua' 
      ? ` Komunitas ${challenge.targetCommunity}` 
      : '';

    return this.sendNotification({
      title: '🌿 Tantangan Gotong Royong Baru!',
      body: `Aksi baru${commText}: "${challenge.title}"${pointsText}. Mari rawat bumi bersama!`,
      tag: `new-challenge-${challenge.title.slice(0, 20)}`,
      data: {
        url: '/?tab=challenges',
        type: 'new_challenge',
      },
    });
  }

  /**
   * Notifikasi saat bukti aksi / laporan tantangan pengguna sudah dikonfirmasi & disetujui admin
   */
  static async notifySubmissionApproved(submission: {
    challengeTitle?: string;
    awardedPoints?: number;
    userName?: string;
  }): Promise<boolean> {
    const title = submission.challengeTitle || 'Tantangan Gotong Royong';
    const points = submission.awardedPoints ? `+${submission.awardedPoints} Poin Hijau telah ditambahkan ke profil Anda!` : 'Aksi Anda berhasil diverifikasi!';

    return this.sendNotification({
      title: '✅ Bukti Aksi Dikonfirmasi!',
      body: `Hebat! Bukti aksi untuk "${title}" telah disetujui oleh admin. ${points}`,
      tag: `submission-approved-${Date.now()}`,
      data: {
        url: '/?tab=impact',
        type: 'submission_approved',
      },
    });
  }

  /**
   * Notifikasi saat laporan lingkungan disetujui admin
   */
  static async notifyReportApproved(report: {
    title: string;
    locationName?: string;
  }): Promise<boolean> {
    return this.sendNotification({
      title: '📢 Laporan Lingkungan Disetujui!',
      body: `Laporan Anda mengenai "${report.title}" telah diverifikasi dan diteruskan ke aksi komunitas.`,
      tag: `report-approved-${Date.now()}`,
      data: {
        url: '/?tab=reports',
        type: 'report_approved',
      },
    });
  }
}
