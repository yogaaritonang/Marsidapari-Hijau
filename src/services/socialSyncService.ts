import { ThreadPost, ThreadReply, ChallengeSubmission, AppNotification, User, BrandSettings, EcotheologyArticle } from '../types';
import { StorageService } from './storageService';

const NOTIFICATIONS_STORAGE_KEY = 'mh_notifications';
const CHEERS_STORAGE_KEY = 'mh_leaderboard_cheers';

export class SocialSyncService {
  private static isSyncing = false;

  /**
   * Pulls the latest social data and brand configuration from the shared server:
   * - Brand identity & Logo (so admin changes reflect on all devices instantly)
   * - Threads (with likes, saves, comments from all users)
   * - Submissions (for unified leaderboard)
   * - Cheers (leaderboard loves from all users)
   * - Notifications for current active user
   */
  static async pullSocialData(user?: User | null): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      const url = user?.id && user.id !== 'guest-preview'
        ? `/api/social-sync?userId=${encodeURIComponent(user.id)}`
        : '/api/social-sync';

      const response = await fetch(url);
      if (!response.ok) return;

      const data = await response.json();
      if (!data) return;

      // 0. Sync Brand Settings & Logo (from Admin)
      if (data.brand && typeof data.brand === 'object' && Object.keys(data.brand).length > 0) {
        const localBrand = StorageService.getBrandSettings();
        // Check if there are changes before updating
        if (JSON.stringify(localBrand) !== JSON.stringify(data.brand)) {
          const merged = { ...localBrand, ...data.brand };
          StorageService.saveBrandSettings(merged);
          window.dispatchEvent(new CustomEvent('mh-brand-updated', { detail: merged }));
        }
      }

      // 1. Sync Threads (two-way merge & self-healing so user threads are never lost)
      if (Array.isArray(data.threads)) {
        const local = StorageService.getThreads();
        const threadMap = new Map<string, ThreadPost>();

        // Register server threads
        for (const t of data.threads) {
          if (t && t.id) threadMap.set(t.id, t);
        }

        // Preserve any user threads stored locally and merge social state (likes, saves, replies)
        for (const t of local) {
          if (t && t.id) {
            if (!threadMap.has(t.id)) {
              threadMap.set(t.id, t);
              // Re-upload to server in background so all other users see it again
              void this.syncThread(t);
            } else {
              const serverThread = threadMap.get(t.id)!;

              // Merge likedBy lists using Set union
              const serverLikedBy = Array.isArray(serverThread.likedBy) ? serverThread.likedBy : [];
              const localLikedBy = Array.isArray(t.likedBy) ? t.likedBy : [];
              const mergedLikedBy = Array.from(new Set([...serverLikedBy, ...localLikedBy]));
              serverThread.likedBy = mergedLikedBy;
              serverThread.likes = Math.max(serverThread.likes || 0, t.likes || 0, mergedLikedBy.length);

              // Merge savedBy lists using Set union
              const serverSavedBy = Array.isArray(serverThread.savedBy) ? serverThread.savedBy : [];
              const localSavedBy = Array.isArray(t.savedBy) ? t.savedBy : [];
              serverThread.savedBy = Array.from(new Set([...serverSavedBy, ...localSavedBy]));

              // Merge local replies if any were added offline
              const serverReplyIds = new Set((serverThread.replies || []).map((r) => r.id));
              const localUnsyncedReplies = (t.replies || []).filter((r) => !serverReplyIds.has(r.id));
              if (localUnsyncedReplies.length > 0) {
                serverThread.replies = [...(serverThread.replies || []), ...localUnsyncedReplies];
              }
            }
          }
        }

        const mergedThreads = [...threadMap.values()].sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        StorageService.saveThreads(mergedThreads);
        window.dispatchEvent(new CustomEvent('mh-threads-updated', { detail: mergedThreads }));
      }

      // 2. Sync Submissions for Leaderboard
      if (Array.isArray(data.submissions)) {
        const local = StorageService.getSubmissions();
        const map = new Map<string, ChallengeSubmission>();
        for (const s of data.submissions) map.set(s.id, s);
        // Also ensure any local valid submission is uploaded to server if not on server yet
        for (const s of local) {
          if (!map.has(s.id)) {
            map.set(s.id, s);
            if (s.verdict === 'valid') {
              void this.syncSubmission(s);
            }
          }
        }
        const merged = [...map.values()];
        StorageService.saveSubmissions(merged);
        window.dispatchEvent(new CustomEvent('mh-leaderboard-updated', { detail: merged }));
        window.dispatchEvent(new CustomEvent('mh-data-updated', { detail: { collection: 'submissions' } }));
      }

      // 3. Sync Cheers (two-way merge)
      if (data.cheers && typeof data.cheers === 'object') {
        const localCheers = this.getLocalCheers();
        const mergedCheers = { ...localCheers };

        for (const [memberId, serverCheer] of Object.entries(data.cheers as Record<string, { count: number; users: string[] }>)) {
          const localItem = mergedCheers[memberId] || { count: 0, users: [] };
          const mergedUsers = Array.from(new Set([...(localItem.users || []), ...(serverCheer.users || [])]));
          const mergedCount = Math.max(serverCheer.count || 0, localItem.count || 0, mergedUsers.length);
          mergedCheers[memberId] = {
            count: mergedCount,
            users: mergedUsers,
          };
        }

        localStorage.setItem(CHEERS_STORAGE_KEY, JSON.stringify(mergedCheers));
        window.dispatchEvent(new CustomEvent('mh-cheers-updated', { detail: mergedCheers }));
      }

      // 4. Sync Notifications
      if (Array.isArray(data.notifications)) {
        this.saveLocalNotifications(data.notifications);
        window.dispatchEvent(new CustomEvent('mh-notifications-updated', { detail: data.notifications }));
      }

      // 5. Sync Ecotheology Articles
      if (Array.isArray(data.ecotheology)) {
        const local = StorageService.getEcotheologyArticles();
        const map = new Map<string, EcotheologyArticle>();
        for (const a of data.ecotheology) {
          if (a && a.id) map.set(a.id, a);
        }
        for (const a of local) {
          if (a && a.id && !map.has(a.id)) {
            map.set(a.id, a);
          }
        }
        const mergedEco = [...map.values()];
        StorageService.saveEcotheologyArticles(mergedEco);
      }
    } catch (e) {
      console.warn('[SocialSyncService] Server sync temporarily offline, using local data', e);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync brand settings (logo, name, colors, etc.) from admin to server for all users
   */
  static async syncBrand(brand: BrandSettings): Promise<void> {
    StorageService.saveBrandSettings(brand);
    window.dispatchEvent(new CustomEvent('mh-brand-updated', { detail: brand }));

    try {
      await fetch('/api/social-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_brand', payload: brand }),
      });
    } catch (e) {
      console.warn('[SocialSyncService] syncBrand error', e);
    }
  }

  /**
   * Post a new thread and push to server
   */
  static async createThread(post: ThreadPost): Promise<void> {
    // 1. Optimistic local update
    StorageService.addThread(post);
    window.dispatchEvent(new CustomEvent('mh-threads-updated', { detail: StorageService.getThreads() }));

    // 2. Remote sync
    await this.syncThread(post);
  }

  /**
   * Push a thread to the server (used for creation and background re-sync)
   */
  static async syncThread(post: ThreadPost): Promise<void> {
    try {
      await fetch('/api/social-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_thread', payload: post }),
      });
    } catch (e) {
      console.warn('[SocialSyncService] syncThread remote error', e);
    }
  }

  /**
   * Toggle like on a thread
   */
  static async toggleLikeThread(threadId: string, user: User): Promise<void> {
    // 1. Optimistic local update
    StorageService.toggleLikeThread(threadId, user.id);
    const updatedThreads = StorageService.getThreads();
    window.dispatchEvent(new CustomEvent('mh-threads-updated', { detail: updatedThreads }));

    const targetThread = updatedThreads.find((t) => t.id === threadId);

    // 2. Remote sync
    try {
      const res = await fetch('/api/social-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'like_thread',
          payload: {
            threadId,
            user: { id: user.id, name: user.name },
            thread: targetThread,
          },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.threads)) {
          StorageService.saveThreads(data.threads);
          window.dispatchEvent(new CustomEvent('mh-threads-updated', { detail: data.threads }));
        }
      }
    } catch (e) {
      console.warn('[SocialSyncService] toggleLikeThread remote error', e);
    }
  }

  /**
   * Sync ecotheology articles across devices
   */
  static async syncEcotheologyArticles(articles: EcotheologyArticle[]): Promise<void> {
    StorageService.saveEcotheologyArticles(articles);
    try {
      await fetch('/api/social-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_ecotheology', payload: articles }),
      });
    } catch (e) {
      console.warn('[SocialSyncService] syncEcotheologyArticles error', e);
    }
  }

  /**
   * Toggle save/bookmark on a thread
   */
  static async toggleSaveThread(threadId: string, userId: string): Promise<boolean> {
    const list = StorageService.getThreads();
    let isNowSaved = false;
    const updated = list.map((thread) => {
      if (thread.id !== threadId) return thread;
      const savedBy = thread.savedBy || [];
      const hasSaved = savedBy.includes(userId);
      isNowSaved = !hasSaved;
      const newSavedBy = hasSaved ? savedBy.filter((id) => id !== userId) : [...savedBy, userId];
      return { ...thread, savedBy: newSavedBy };
    });

    StorageService.saveThreads(updated);
    window.dispatchEvent(new CustomEvent('mh-threads-updated', { detail: updated }));

    try {
      await fetch('/api/social-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_thread',
          payload: { threadId, userId },
        }),
      });
    } catch (e) {
      console.warn('[SocialSyncService] toggleSaveThread remote error', e);
    }

    return isNowSaved;
  }

  /**
   * Add reply/comment to a thread
   */
  static async addThreadReply(threadId: string, reply: ThreadReply): Promise<void> {
    StorageService.addThreadReply(threadId, reply);
    const updatedThreads = StorageService.getThreads();
    window.dispatchEvent(new CustomEvent('mh-threads-updated', { detail: updatedThreads }));

    try {
      const res = await fetch('/api/social-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reply_thread',
          payload: { threadId, reply },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.threads) {
          StorageService.saveThreads(data.threads);
          window.dispatchEvent(new CustomEvent('mh-threads-updated', { detail: data.threads }));
        }
      }
    } catch (e) {
      console.warn('[SocialSyncService] addThreadReply remote error', e);
    }
  }

  /**
   * Delete thread
   */
  static async deleteThread(threadId: string): Promise<void> {
    StorageService.deleteThread(threadId);
    window.dispatchEvent(new CustomEvent('mh-threads-updated', { detail: StorageService.getThreads() }));

    try {
      await fetch('/api/social-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_thread', payload: { threadId } }),
      });
    } catch (e) {
      console.warn('[SocialSyncService] deleteThread remote error', e);
    }
  }

  /**
   * Send love/cheer on Leaderboard to a member
   */
  static async cheerLeaderboard(targetMemberId: string, targetMemberName: string, cheerer: User): Promise<number> {
    // 1. Optimistic local update
    const currentCheers = this.getLocalCheers();
    const target = currentCheers[targetMemberId] || { count: 0, users: [] };
    if (!target.users.includes(cheerer.id)) {
      target.users.push(cheerer.id);
    }
    target.count += 1;
    currentCheers[targetMemberId] = target;
    localStorage.setItem(CHEERS_STORAGE_KEY, JSON.stringify(currentCheers));
    window.dispatchEvent(new CustomEvent('mh-cheers-updated', { detail: currentCheers }));

    // 2. Remote sync
    try {
      const res = await fetch('/api/social-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cheer_leaderboard',
          payload: {
            targetMemberId,
            targetMemberName,
            cheerer: { id: cheerer.id, name: cheerer.name },
          },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.cheers) {
          localStorage.setItem(CHEERS_STORAGE_KEY, JSON.stringify(data.cheers));
          window.dispatchEvent(new CustomEvent('mh-cheers-updated', { detail: data.cheers }));
        }
      }
    } catch (e) {
      console.warn('[SocialSyncService] cheerLeaderboard remote error', e);
    }

    return target.count;
  }

  /**
   * Get all leaderboard cheers
   */
  static getLocalCheers(): Record<string, { count: number; users: string[] }> {
    try {
      const raw = localStorage.getItem(CHEERS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  /**
   * Submit challenge and push to server
   */
  static async syncSubmission(submission: ChallengeSubmission): Promise<void> {
    try {
      const res = await fetch('/api/social-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit_challenge', payload: submission }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.submissions)) {
          StorageService.saveSubmissions(data.submissions);
          window.dispatchEvent(new CustomEvent('mh-leaderboard-updated', { detail: data.submissions }));
          window.dispatchEvent(new CustomEvent('mh-data-updated', { detail: { collection: 'submissions' } }));
        }
      }
    } catch (e) {
      console.warn('[SocialSyncService] syncSubmission error', e);
    }
  }

  /**
   * Get local notifications
   */
  static getLocalNotifications(): AppNotification[] {
    try {
      const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private static saveLocalNotifications(notifications: AppNotification[]) {
    try {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
    } catch (e) {
      console.warn('[SocialSyncService] failed to save notifications', e);
    }
  }

  /**
   * Mark notification as read
   */
  static async markNotificationRead(notificationId?: string, userId?: string): Promise<void> {
    const list = this.getLocalNotifications();
    const updated = list.map((n) => {
      if (notificationId && n.id === notificationId) return { ...n, read: true };
      if (!notificationId && userId && n.recipientUserId === userId) return { ...n, read: true };
      return n;
    });
    this.saveLocalNotifications(updated);
    window.dispatchEvent(new CustomEvent('mh-notifications-updated', { detail: updated }));

    try {
      await fetch('/api/social-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_notification_read',
          payload: { notificationId },
          userId,
        }),
      });
    } catch (e) {
      console.warn('[SocialSyncService] markNotificationRead error', e);
    }
  }
}
