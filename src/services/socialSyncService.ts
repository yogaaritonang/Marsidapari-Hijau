import {
  AppNotification,
  BrandSettings,
  ChallengeSubmission,
  EcotheologyArticle,
  ThreadPost,
  ThreadReply,
  User,
} from '../types';
import { StorageService } from './storageService';
import { SharedDataService } from './sharedDataService';
import { PersistentDataService } from './persistentDataService';

const NOTIFICATIONS_STORAGE_KEY = 'mh_notifications';
const CHEERS_STORAGE_KEY = 'mh_leaderboard_cheers';

function reportSyncError(error: unknown): void {
  console.error('[SocialSyncService]', error);
}

function saveLocalNotifications(notifications: AppNotification[]): void {
  localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
}

function saveLocalCheers(cheers: Record<string, { count: number; users: string[] }>): void {
  localStorage.setItem(CHEERS_STORAGE_KEY, JSON.stringify(cheers));
}

function dispatchNotificationUpdate(notifications: AppNotification[]): void {
  saveLocalNotifications(notifications);
  window.dispatchEvent(new CustomEvent('mh-notifications-updated', { detail: notifications }));
}

function dispatchCheersUpdate(cheers: Record<string, { count: number; users: string[] }>): void {
  saveLocalCheers(cheers);
  window.dispatchEvent(new CustomEvent('mh-cheers-updated', { detail: cheers }));
}

export class SocialSyncService {
  private static activeSync: Promise<boolean> | null = null;
  private static notificationRefreshVersion = 0;

  static async syncMember(user: User): Promise<void> {
    if (!user.id || StorageService.isGuestUserId(user.id) || !user.communityId) return;
    try {
      const hydratedUser = await PersistentDataService.syncUserProfile(user);
      StorageService.saveUser(hydratedUser);
      SharedDataService.updateActiveUser(hydratedUser);
      await PersistentDataService.syncMembership(hydratedUser);
      await PersistentDataService.syncEventRegistrations();
    } catch (error) {
      reportSyncError(error);
    }
  }

  static async refreshCommunityMemberCounts(): Promise<void> {
    try {
      await PersistentDataService.refreshCommunityMemberCounts();
    } catch (error) {
      reportSyncError(error);
    }
  }

  static pullSocialData(user?: User | null): Promise<boolean> {
    if (!user?.id || StorageService.isGuestUserId(user.id)) return Promise.resolve(false);
    if (this.activeSync) return this.activeSync;
    this.activeSync = this.performPullSocialData(user).finally(() => {
      this.activeSync = null;
    });
    return this.activeSync;
  }

  private static async performPullSocialData(user: User): Promise<boolean> {
    const operations: Array<Promise<unknown>> = [
      SharedDataService.refreshCollection('brand'),
      SharedDataService.refreshCollection('threads'),
      PersistentDataService.syncSubmissions(),
      PersistentDataService.syncEventRegistrations(),
      PersistentDataService.loadCheers().then(dispatchCheersUpdate),
      this.refreshNotifications(user),
      PersistentDataService.refreshCommunityMemberCounts(),
    ];
    const results = await Promise.allSettled(operations);
    for (const result of results) {
      if (result.status === 'rejected') reportSyncError(result.reason);
    }
    return results[2].status === 'fulfilled';
  }

  static async syncBrand(brand: BrandSettings): Promise<void> {
    try {
      StorageService.saveBrandSettings(brand);
      window.dispatchEvent(new CustomEvent('mh-brand-updated', { detail: brand }));
      await SharedDataService.upsertRecord(
        'brand',
        'global',
        { id: 'global', ...brand } as unknown as Record<string, unknown>,
      );
    } catch (error) {
      reportSyncError(error);
    }
  }

  static async createThread(post: ThreadPost): Promise<void> {
    await this.syncThread(post);
    const savedPost = StorageService.getThreads().find((item) => item.id === post.id);
    if (!savedPost) StorageService.addThread(post);
    window.dispatchEvent(new CustomEvent('mh-threads-updated', { detail: StorageService.getThreads() }));
  }

  static async syncThread(post: ThreadPost): Promise<void> {
    try {
      const user = StorageService.getUser();
      const savedPost = post.imageUrl
        ? { ...post, imageUrl: await PersistentDataService.uploadUserImage(post.imageUrl, user.id, `thread-${post.id}`) }
        : post;
      await SharedDataService.upsertRecord(
        'threads',
        savedPost.id,
        savedPost as unknown as Record<string, unknown>,
        savedPost.userId,
        user.communityId,
      );
      const existing = StorageService.getThreads().some((item) => item.id === savedPost.id);
      if (existing) {
        StorageService.saveThreads(StorageService.getThreads().map((item) => item.id === savedPost.id ? savedPost : item));
      } else {
        StorageService.addThread(savedPost);
      }
      window.dispatchEvent(new CustomEvent('mh-threads-updated', { detail: StorageService.getThreads() }));
    } catch (error) {
      reportSyncError(error);
      throw error;
    }
  }

  static async toggleLikeThread(threadId: string, user: User): Promise<void> {
    try {
      const updatedPost = await PersistentDataService.toggleThreadLike(threadId, user.id);
      SharedDataService.applyThreadUpdate(updatedPost);
      window.dispatchEvent(new CustomEvent('mh-notifications-refresh'));
    } catch (error) {
      reportSyncError(error);
      throw error;
    }
  }

  static async syncEcotheologyArticles(articles: EcotheologyArticle[]): Promise<void> {
    try {
      StorageService.saveEcotheologyArticles(articles);
      await SharedDataService.flushCollection('ecotheology');
    } catch (error) {
      reportSyncError(error);
      throw error;
    }
  }

  static async toggleSaveThread(threadId: string, userId: string): Promise<boolean> {
    const list = StorageService.getThreads();
    let isNowSaved = false;
    const updated = list.map((thread) => {
      if (thread.id !== threadId) return thread;
      const savedBy = thread.savedBy || [];
      const hasSaved = savedBy.includes(userId);
      isNowSaved = !hasSaved;
      return {
        ...thread,
        savedBy: hasSaved ? savedBy.filter((id) => id !== userId) : [...savedBy, userId],
      };
    });

    StorageService.saveThreads(updated);
    try {
      await SharedDataService.flushCollection('threads');
    } catch (error) {
      reportSyncError(error);
    }
    window.dispatchEvent(new CustomEvent('mh-threads-updated', { detail: updated }));
    return isNowSaved;
  }

  static async addThreadReply(threadId: string, reply: ThreadReply): Promise<void> {
    try {
      const updatedPost = await PersistentDataService.addThreadReply(threadId, reply, reply.userId);
      SharedDataService.applyThreadUpdate(updatedPost);
      window.dispatchEvent(new CustomEvent('mh-notifications-refresh'));
    } catch (error) {
      reportSyncError(error);
      throw error;
    }
  }

  static async deleteThread(threadId: string): Promise<void> {
    const user = StorageService.getCachedUser();
    const thread = StorageService.getThreads().find((item) => item.id === threadId);
    if (!thread) return;
    if (thread.userId !== user.id && user.role !== 'admin') {
      throw new Error('Anda tidak berwenang menghapus postingan pengguna lain.');
    }

    try {
      await SharedDataService.deleteRecord('threads', threadId);
    } catch (error) {
      reportSyncError(error);
      throw error;
    }
    StorageService.deleteThread(threadId);
    window.dispatchEvent(new CustomEvent('mh-threads-updated', { detail: StorageService.getThreads() }));
  }

  static async cheerLeaderboard(targetMemberId: string, cheerer: User): Promise<number> {
    try {
      const { cheers, added } = await PersistentDataService.toggleCheer(targetMemberId, cheerer.id);
      dispatchCheersUpdate(cheers);
      if (added) {
        window.dispatchEvent(new CustomEvent('mh-notifications-refresh'));
      }
      return cheers[targetMemberId]?.count || 0;
    } catch (error) {
      reportSyncError(error);
      throw error;
    }
  }

  static getLocalCheers(): Record<string, { count: number; users: string[] }> {
    try {
      const raw = localStorage.getItem(CHEERS_STORAGE_KEY);
      return raw ? JSON.parse(raw) as Record<string, { count: number; users: string[] }> : {};
    } catch (error) {
      console.warn('[SocialSyncService] Cache apresiasi rusak:', error);
      return {};
    }
  }

  static async syncSubmission(submission: ChallengeSubmission): Promise<void> {
    if (StorageService.isGuestUserId(submission.userId)) return;
    try {
      const saved = await PersistentDataService.saveSubmission(submission);
      if (!saved) return;
      const submissions = new Map(StorageService.getSubmissions().map((item) => [item.id, item]));
      submissions.set(saved.id, saved);
      StorageService.saveSubmissions([...submissions.values()]);
    } catch (error) {
      reportSyncError(error);
    }
  }

  static getLocalNotifications(): AppNotification[] {
    try {
      const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      return raw ? JSON.parse(raw) as AppNotification[] : [];
    } catch (error) {
      console.warn('[SocialSyncService] Cache notifikasi rusak:', error);
      return [];
    }
  }

  static async refreshNotifications(user: User): Promise<void> {
    if (!user.id || StorageService.isGuestUserId(user.id)) return;
    const refreshVersion = ++this.notificationRefreshVersion;
    try {
      const notifications = await PersistentDataService.loadNotifications(user.id);
      if (refreshVersion !== this.notificationRefreshVersion) return;
      const otherUsers = this.getLocalNotifications().filter((item) => item.recipientUserId !== user.id);
      dispatchNotificationUpdate([...notifications, ...otherUsers]);
    } catch (error) {
      reportSyncError(error);
    }
  }

  static addNotification(notification: AppNotification): void {
    const list = this.getLocalNotifications();
    const updated = [notification, ...list.filter((item) => item.id !== notification.id)].slice(0, 100);
    dispatchNotificationUpdate(updated);
    void PersistentDataService.saveNotification(notification).catch(reportSyncError);
  }

  static async markNotificationRead(notificationId?: string, userId?: string): Promise<void> {
    const list = this.getLocalNotifications();
    const currentUserId = userId || StorageService.getUser().id;
    const updated = list.map((notification) => {
      if (notification.recipientUserId !== currentUserId) return notification;
      if (notificationId && notification.id !== notificationId) return notification;
      return { ...notification, read: true };
    });
    dispatchNotificationUpdate(updated);
    try {
      await PersistentDataService.markNotificationsRead(currentUserId, notificationId);
    } catch (error) {
      reportSyncError(error);
    }
  }
}
