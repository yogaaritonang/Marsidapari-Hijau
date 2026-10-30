export interface ShareDataPayload {
  name?: string;
  points: number;
  communityName?: string;
  trees?: number;
  wasteKg?: number;
  earnedBadgesCount?: number;
  rankTitle?: string;
}

export function getRankTitle(points: number): string {
  if (points >= 500) return 'Duta Ekoteologi Danau Toba';
  if (points >= 300) return 'Pelindung Lembah Silindung';
  if (points >= 150) return 'Penggerak Marsiadapari';
  if (points >= 50) return 'Sahabat Ciptaan';
  return 'Tunas Hijau';
}

export class ShareService {
  static getShareUrl(): string {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return 'https://marsiadapari-hijau.vercel.app';
  }

  static getShareText(payload: ShareDataPayload): string {
    const name = payload.name && payload.name !== 'Sahabat Hijau' ? payload.name : 'Saya';
    const rank = payload.rankTitle || getRankTitle(payload.points);
    const community = payload.communityName ? ` (${payload.communityName})` : '';
    const statsList: string[] = [];

    statsList.push(`⭐ ${payload.points} Poin Hijau (${rank})`);
    if (payload.trees && payload.trees > 0) {
      statsList.push(`🌱 ${payload.trees} Bibit Pohon Ditanam`);
    }
    if (payload.wasteKg && payload.wasteKg > 0) {
      statsList.push(`♻️ ${payload.wasteKg} kg Sampah Dipilah`);
    }
    if (payload.earnedBadgesCount && payload.earnedBadgesCount > 0) {
      statsList.push(`🎖️ ${payload.earnedBadgesCount} Lencana Terbuka`);
    }

    const statsBlock = statsList.length > 0 ? statsList.join('\n') : `⭐ ${payload.points} Poin Hijau`;

    return `🌿 Puji Tuhan! ${name}${community} telah mengumpulkan pencapaian aksi lingkungan di Marsiadapari Hijau:

${statsBlock}

Mari bersama merawat bumi ciptaan Tuhan dan kelestarian Danau Toba melalui gotong royong ekologis setiap hari!

👉 Gabung dan ambil aksi bersamaku di: ${this.getShareUrl()}
#MarsiadapariHijau #Ekoteologi #DanauToba #AksiHijau`;
  }

  static isWebShareSupported(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  }

  static async shareAchievement(
    payload: ShareDataPayload
  ): Promise<{ success: boolean; method: 'native' | 'clipboard' | 'cancelled' }> {
    const text = this.getShareText(payload);
    const url = this.getShareUrl();
    const title = `Aksi Hijau: ${payload.points} Poin Hijau - Marsiadapari Hijau`;

    if (this.isWebShareSupported()) {
      try {
        await navigator.share({
          title,
          text,
          url,
        });
        return { success: true, method: 'native' };
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          return { success: false, method: 'cancelled' };
        }
        // Fallback to clipboard if share failed
      }
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        return { success: true, method: 'clipboard' };
      }
    } catch {
      // ignore
    }

    return { success: false, method: 'cancelled' };
  }

  static getWhatsAppUrl(payload: ShareDataPayload): string {
    const text = this.getShareText(payload);
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  }

  static getFacebookUrl(): string {
    const url = this.getShareUrl();
    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  }

  static getTwitterUrl(payload: ShareDataPayload): string {
    const text = `🌿 Saya sudah mengumpulkan ${payload.points} Poin Hijau di Marsiadapari Hijau! Mari bersama merawat Danau Toba dan bumi ciptaan Tuhan.`;
    const url = this.getShareUrl();
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  }

  static getTelegramUrl(payload: ShareDataPayload): string {
    const text = this.getShareText(payload);
    const url = this.getShareUrl();
    return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  }
}
