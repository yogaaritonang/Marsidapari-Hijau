import type { Request, Response } from 'express';
import { ThreadPost, ChallengeSubmission, AppNotification, BrandSettings } from '../src/types/index.js';
import { SEED_THREADS } from '../src/data/seedData.js';

// Server-level in-memory state shared across client sessions on this server instance
interface SocialStore {
  brand: BrandSettings | null;
  threads: ThreadPost[];
  submissions: ChallengeSubmission[];
  cheers: Record<string, { count: number; users: string[] }>;
  notifications: AppNotification[];
}

const INITIAL_COMMUNITY_SUBMISSIONS: ChallengeSubmission[] = [
  {
    id: 'sub-seed-1',
    userId: 'u-naomi',
    userName: 'Naomi Siregar',
    isAnonymous: false,
    challengeId: 'chal-tumbler',
    challengeTitle: 'Gunakan Tumbler & Kurangi Botol Plastik',
    category: 'harian',
    submittedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    verdict: 'valid',
    confidence: 95,
    userNotes: 'Membawa tumbler sendiri saat perkuliahan di IAKN Tarutung',
    imageThumbnail: '',
    imageHash: 'hash-naomi-tumbler-1',
    yang_terlihat: 'Botol minum tumbler pribadi yang digunakan saat beraktivitas',
    alasan: 'Sesuai dengan kriteria tantangan pengurangan sampah plastik',
    saran: 'Terus pertahankan kebiasaan membawa tumbler setiap hari',
    impact: { wasteKg: 0.8, trees: 0, waterLiters: 20, electricityKwh: 0 },
    awardedPoints: 40,
  },
  {
    id: 'sub-seed-2',
    userId: 'u-daniel',
    userName: 'Daniel Sitompul',
    isAnonymous: false,
    challengeId: 'chal-tanam-pohon',
    challengeTitle: 'Tanam & Rawat 1 Pohon Endemik',
    category: 'danau_toba',
    submittedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    verdict: 'valid',
    confidence: 92,
    userNotes: 'Menanam bibit pohon alpukat di pekarangan gereja HKBP',
    imageThumbnail: '',
    imageHash: 'hash-daniel-tree-1',
    yang_terlihat: 'Penanaman bibit pohon di pekarangan dengan tanah gembur',
    alasan: 'Tindakan penghijauan nyata terverifikasi',
    saran: 'Pastikan penyiraman rutin selama 3 bulan pertama',
    impact: { wasteKg: 0, trees: 2, waterLiters: 0, electricityKwh: 0 },
    awardedPoints: 50,
  },
  {
    id: 'sub-seed-3',
    userId: 'u-johannes',
    userName: 'Johannes Hutabarat',
    isAnonymous: false,
    challengeId: 'chal-pilah-sampah',
    challengeTitle: 'Pilah Sampah Organik & Anorganik',
    category: 'harian',
    submittedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    verdict: 'valid',
    confidence: 88,
    userNotes: 'Memilah sampah plastik dan kardus untuk bank sampah',
    imageThumbnail: '',
    imageHash: 'hash-johannes-sort-1',
    yang_terlihat: 'Wadah terpisah untuk sampah plastik dan kertas',
    alasan: 'Pemilahan sampah sesuai standar daur ulang',
    saran: 'Dapat disalurkan ke bank sampah komunitas terdekat',
    impact: { wasteKg: 3.5, trees: 0, waterLiters: 0, electricityKwh: 0 },
    awardedPoints: 30,
  },
  {
    id: 'sub-seed-4',
    userId: 'u-ruth',
    userName: 'Ruth Simanjuntak',
    isAnonymous: false,
    challengeId: 'chal-komunitas-iakn',
    challengeTitle: 'Gotong Royong Kampus Asri IAKN Tarutung',
    category: 'komunitas',
    submittedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    verdict: 'valid',
    confidence: 96,
    userNotes: 'Aksi marsiadapari bersama pemuda membersihkan selokan',
    imageThumbnail: '',
    imageHash: 'hash-ruth-gotong-royong-1',
    yang_terlihat: 'Kerja bakti gotong royong pembersihan selokan dan lingkungan',
    alasan: 'Aktivitas aksi marsiadapari hijau komunitas terdokumentasi jelas',
    saran: 'Sangat menginspirasi lingkungan sekitar',
    impact: { wasteKg: 8.0, trees: 1, waterLiters: 40, electricityKwh: 0 },
    awardedPoints: 70,
  },
];

const store: SocialStore = {
  brand: null,
  threads: [...SEED_THREADS],
  submissions: [...INITIAL_COMMUNITY_SUBMISSIONS],
  cheers: {},
  notifications: [],
};

export default async function socialSyncHandler(req: Request, res: Response) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: Fetch all shared social data or user-specific notifications
  if (req.method === 'GET') {
    const userId = req.query.userId as string | undefined;
    const userNotifications = userId
      ? store.notifications.filter((n) => n.recipientUserId === userId)
      : store.notifications;

    return res.status(200).json({
      brand: store.brand,
      threads: store.threads,
      submissions: store.submissions,
      cheers: store.cheers,
      notifications: userNotifications,
      serverTime: new Date().toISOString(),
    });
  }

  // POST: Mutate or sync social data
  if (req.method === 'POST') {
    let body: any = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({ error: 'Format JSON tidak valid.' });
      }
    }

    const { action, payload, userId } = body || {};

    switch (action) {
      case 'update_brand': {
        const brandPayload = payload as BrandSettings;
        if (brandPayload && typeof brandPayload === 'object') {
          store.brand = { ...(store.brand || {}), ...brandPayload };
          return res.status(200).json({ success: true, brand: store.brand });
        }
        return res.status(400).json({ error: 'Data brand tidak valid.' });
      }
      case 'create_thread': {
        const thread: ThreadPost = payload;
        if (!thread || !thread.id) {
          return res.status(400).json({ error: 'Data thread tidak valid.' });
        }
        // Prepend to server threads
        store.threads = [thread, ...store.threads.filter((t) => t.id !== thread.id)];
        return res.status(200).json({ success: true, thread, threads: store.threads });
      }

      case 'like_thread': {
        const { threadId, user: likingUser } = payload || {};
        if (!threadId || !likingUser) {
          return res.status(400).json({ error: 'threadId dan user diperlukan.' });
        }

        const thread = store.threads.find((t) => t.id === threadId);
        if (thread) {
          thread.likedBy = thread.likedBy || [];
          const hasLiked = thread.likedBy.includes(likingUser.id);
          if (hasLiked) {
            thread.likedBy = thread.likedBy.filter((id) => id !== likingUser.id);
            thread.likes = Math.max(0, (thread.likes || 1) - 1);
          } else {
            thread.likedBy.push(likingUser.id);
            thread.likes = (thread.likes || 0) + 1;

            // Trigger notification to thread owner if it's not the same user
            if (thread.userId && thread.userId !== likingUser.id) {
              const notif: AppNotification = {
                id: `notif-like-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                recipientUserId: thread.userId,
                senderUserId: likingUser.id,
                senderName: likingUser.name || 'Seseorang',
                type: 'thread_like',
                targetId: thread.id,
                title: 'Menyukai Utas Anda',
                message: `${likingUser.name || 'Seorang pengguna'} menyukai utas Anda: "${thread.caption.slice(0, 45)}${thread.caption.length > 45 ? '...' : ''}"`,
                createdAt: new Date().toISOString(),
                read: false,
              };
              store.notifications.unshift(notif);
            }
          }
        }
        return res.status(200).json({ success: true, threads: store.threads });
      }

      case 'save_thread': {
        const { threadId, userId: savingUserId } = payload || {};
        if (!threadId || !savingUserId) {
          return res.status(400).json({ error: 'threadId dan userId diperlukan.' });
        }

        const thread = store.threads.find((t) => t.id === threadId);
        if (thread) {
          thread.savedBy = thread.savedBy || [];
          const hasSaved = thread.savedBy.includes(savingUserId);
          if (hasSaved) {
            thread.savedBy = thread.savedBy.filter((id) => id !== savingUserId);
          } else {
            thread.savedBy.push(savingUserId);
          }
        }
        return res.status(200).json({ success: true, threads: store.threads });
      }

      case 'reply_thread': {
        const { threadId, reply } = payload || {};
        if (!threadId || !reply) {
          return res.status(400).json({ error: 'threadId dan reply diperlukan.' });
        }

        const thread = store.threads.find((t) => t.id === threadId);
        if (thread) {
          thread.replies = thread.replies || [];
          thread.replies.push(reply);

          // Trigger notification to thread owner if someone else commented
          if (thread.userId && thread.userId !== reply.userId) {
            const notif: AppNotification = {
              id: `notif-rep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              recipientUserId: thread.userId,
              senderUserId: reply.userId,
              senderName: reply.userName || 'Seseorang',
              type: 'thread_reply',
              targetId: thread.id,
              title: 'Membalas Utas Anda',
              message: `${reply.userName || 'Seorang pengguna'} mengomentari: "${reply.content.slice(0, 50)}${reply.content.length > 50 ? '...' : ''}"`,
              createdAt: new Date().toISOString(),
              read: false,
            };
            store.notifications.unshift(notif);
          }
        }
        return res.status(200).json({ success: true, threads: store.threads });
      }

      case 'delete_thread': {
        const { threadId } = payload || {};
        store.threads = store.threads.filter((t) => t.id !== threadId);
        return res.status(200).json({ success: true, threads: store.threads });
      }

      case 'cheer_leaderboard': {
        const { targetMemberId, targetMemberName, cheerer } = payload || {};
        if (!targetMemberId || !cheerer) {
          return res.status(400).json({ error: 'targetMemberId dan cheerer diperlukan.' });
        }

        const current = store.cheers[targetMemberId] || { count: 0, users: [] };
        if (!current.users.includes(cheerer.id)) {
          current.users.push(cheerer.id);
        }
        current.count += 1;
        store.cheers[targetMemberId] = current;

        // Trigger notification to recipient member if not self
        if (targetMemberId !== cheerer.id) {
          const notif: AppNotification = {
            id: `notif-cheer-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            recipientUserId: targetMemberId,
            senderUserId: cheerer.id,
            senderName: cheerer.name || 'Sahabat Hijau',
            type: 'leaderboard_cheer',
            targetId: targetMemberId,
            title: 'Mendapat Dukungan Love di Peringkat!',
            message: `💖 ${cheerer.name || 'Sahabat Hijau'} mengirimkan semangat & love untuk aksi hijaumu di Leaderboard Marsiadapari!`,
            createdAt: new Date().toISOString(),
            read: false,
          };
          store.notifications.unshift(notif);
        }

        return res.status(200).json({ success: true, cheers: store.cheers });
      }

      case 'submit_challenge': {
        const submission: ChallengeSubmission = payload;
        if (!submission || !submission.id) {
          return res.status(400).json({ error: 'Data submission tidak valid.' });
        }
        store.submissions = [submission, ...store.submissions.filter((s) => s.id !== submission.id)];
        return res.status(200).json({ success: true, submissions: store.submissions });
      }

      case 'mark_notification_read': {
        const { notificationId } = payload || {};
        if (notificationId) {
          store.notifications = store.notifications.map((n) =>
            n.id === notificationId ? { ...n, read: true } : n
          );
        } else if (userId) {
          // Mark all for this user
          store.notifications = store.notifications.map((n) =>
            n.recipientUserId === userId ? { ...n, read: true } : n
          );
        }
        return res.status(200).json({ success: true });
      }

      case 'batch_sync': {
        const { localThreads, localSubmissions } = payload || {};
        if (Array.isArray(localThreads)) {
          const map = new Map<string, ThreadPost>();
          for (const t of store.threads) map.set(t.id, t);
          for (const t of localThreads) {
            if (!map.has(t.id)) map.set(t.id, t);
          }
          store.threads = [...map.values()];
        }
        if (Array.isArray(localSubmissions)) {
          const map = new Map<string, ChallengeSubmission>();
          for (const s of store.submissions) map.set(s.id, s);
          for (const s of localSubmissions) {
            if (!map.has(s.id)) map.set(s.id, s);
          }
          store.submissions = [...map.values()];
        }
        return res.status(200).json({
          success: true,
          threads: store.threads,
          submissions: store.submissions,
          cheers: store.cheers,
        });
      }

      default:
        return res.status(400).json({ error: 'Aksi tidak dikenal.' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
