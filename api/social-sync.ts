import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { ThreadPost, ChallengeSubmission, AppNotification, BrandSettings, EcotheologyArticle } from '../src/types/index.js';
import { SEED_THREADS, SEED_ECOTHEOLOGY } from '../src/data/seedData.js';

// Server-level shared state with disk-backed persistence
interface SocialStore {
  brand: BrandSettings | null;
  threads: ThreadPost[];
  submissions: ChallengeSubmission[];
  cheers: Record<string, { count: number; users: string[] }>;
  notifications: AppNotification[];
  ecotheology: EcotheologyArticle[];
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
    imageThumbnail: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" fill="%232E6B34" rx="20"/><path d="M48 30h24v12H48zM44 44h32v52a6 6 0 0 1-6 6H50a6 6 0 0 1-6-6V44z" fill="%23FAF6EC"/><path d="M52 56h16v24H52z" fill="%232E6B34" opacity="0.3"/></svg>',
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
    imageThumbnail: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" fill="%23235328" rx="20"/><path d="M60 25c-15 0-25 14-20 28 4 10 12 15 15 20v24h10V73c3-5 11-10 15-20 5-14-5-28-20-28z" fill="%237A5230"/><circle cx="60" cy="45" r="22" fill="%23A8D5A2"/></svg>',
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
    imageThumbnail: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" fill="%231E5429" rx="20"/><rect x="35" y="45" width="22" height="45" rx="4" fill="%23FAF6EC"/><rect x="63" y="45" width="22" height="45" rx="4" fill="%23A8D5A2"/><path d="M30 38h60v5H30z" fill="%23FAF6EC"/></svg>',
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
    imageThumbnail: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" fill="%232E6B34" rx="20"/><circle cx="45" cy="45" r="14" fill="%23FAF6EC"/><circle cx="75" cy="45" r="14" fill="%23FAF6EC"/><path d="M30 85c0-12 10-18 20-18h20c10 0 20 6 20 18z" fill="%23A8D5A2"/></svg>',
    imageHash: 'hash-ruth-gotong-royong-1',
    yang_terlihat: 'Kerja bakti gotong royong pembersihan selokan dan lingkungan',
    alasan: 'Aktivitas aksi marsiadapari hijau komunitas terdokumentasi jelas',
    saran: 'Sangat menginspirasi lingkungan sekitar',
    impact: { wasteKg: 8.0, trees: 1, waterLiters: 40, electricityKwh: 0 },
    awardedPoints: 70,
  },
];

const DATA_DIR = path.resolve(process.cwd(), 'data');
const PRIMARY_STORE_PATH = path.join(DATA_DIR, 'social_store.json');
const BACKUP_STORE_PATH = '/tmp/marsiadapari_social_store.json';

function ensureDirectoryExists(dir: string) {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (err) {
    console.warn('[social-sync] Could not ensure data directory:', err);
  }
}

function loadPersistedStore(): SocialStore {
  const defaultStore: SocialStore = {
    brand: null,
    threads: [...SEED_THREADS],
    submissions: [...INITIAL_COMMUNITY_SUBMISSIONS],
    cheers: {},
    notifications: [],
    ecotheology: [...SEED_ECOTHEOLOGY],
  };

  for (const filePath of [PRIMARY_STORE_PATH, BACKUP_STORE_PATH]) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          const storedThreads: ThreadPost[] = Array.isArray(parsed.threads) ? parsed.threads : [];
          const storedSubs: ChallengeSubmission[] = Array.isArray(parsed.submissions) ? parsed.submissions : [];
          const storedEco: EcotheologyArticle[] = Array.isArray(parsed.ecotheology) ? parsed.ecotheology : [];

          // Merge seed threads with stored threads
          const threadMap = new Map<string, ThreadPost>();
          for (const t of defaultStore.threads) {
            if (t && t.id) threadMap.set(t.id, t);
          }
          for (const t of storedThreads) {
            if (t && t.id) {
              const existing = threadMap.get(t.id);
              if (existing) {
                const mergedLikedBy = Array.from(new Set([...(existing.likedBy || []), ...(t.likedBy || [])]));
                threadMap.set(t.id, {
                  ...existing,
                  ...t,
                  likedBy: mergedLikedBy,
                  likes: Math.max(existing.likes || 0, t.likes || 0, mergedLikedBy.length),
                  savedBy: Array.from(new Set([...(existing.savedBy || []), ...(t.savedBy || [])])),
                });
              } else {
                threadMap.set(t.id, t);
              }
            }
          }

          // Merge seed submissions with stored submissions
          const subMap = new Map<string, ChallengeSubmission>();
          for (const s of defaultStore.submissions) {
            if (s && s.id) subMap.set(s.id, s);
          }
          for (const s of storedSubs) {
            if (s && s.id) subMap.set(s.id, s);
          }

          // Merge ecotheology
          const ecoMap = new Map<string, EcotheologyArticle>();
          for (const e of defaultStore.ecotheology) {
            if (e && e.id) ecoMap.set(e.id, e);
          }
          for (const e of storedEco) {
            if (e && e.id) ecoMap.set(e.id, e);
          }

          return {
            brand: parsed.brand || null,
            threads: [...threadMap.values()],
            submissions: [...subMap.values()],
            cheers: parsed.cheers || {},
            notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
            ecotheology: [...ecoMap.values()],
          };
        }
      }
    } catch (err) {
      console.warn(`[social-sync] Could not read ${filePath}:`, err);
    }
  }

  return defaultStore;
}

let store: SocialStore = loadPersistedStore();

async function persistStore(): Promise<void> {
  try {
    ensureDirectoryExists(DATA_DIR);
    const serialized = JSON.stringify(store, null, 2);
    try {
      await fs.promises.writeFile(PRIMARY_STORE_PATH, serialized, 'utf-8');
    } catch {
      // primary write error, continue to backup
    }
    try {
      await fs.promises.writeFile(BACKUP_STORE_PATH, serialized, 'utf-8');
    } catch {
      // backup error
    }
  } catch (err) {
    console.error('[social-sync] Error persisting store to disk:', err);
  }
}

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
      ecotheology: store.ecotheology || [...SEED_ECOTHEOLOGY],
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
          void persistStore();
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
        void persistStore();
        return res.status(200).json({ success: true, thread, threads: store.threads });
      }

      case 'like_thread': {
        const { threadId, user: likingUser, thread: incomingThread } = payload || {};
        if (!threadId || !likingUser) {
          return res.status(400).json({ error: 'threadId dan user diperlukan.' });
        }

        let thread = store.threads.find((t) => t.id === threadId);
        if (!thread && incomingThread && incomingThread.id === threadId) {
          thread = incomingThread;
          store.threads.unshift(thread!);
        }

        if (thread) {
          thread.likedBy = Array.isArray(thread.likedBy) ? thread.likedBy : [];
          const hasLiked = thread.likedBy.includes(likingUser.id);
          if (hasLiked) {
            thread.likedBy = thread.likedBy.filter((id) => id !== likingUser.id);
          } else {
            thread.likedBy = Array.from(new Set([...thread.likedBy, likingUser.id]));

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
          thread.likes = thread.likedBy.length;
          void persistStore();
        }
        return res.status(200).json({ success: true, threads: store.threads });
      }

      case 'update_ecotheology': {
        const articles = payload as EcotheologyArticle[];
        if (Array.isArray(articles)) {
          store.ecotheology = articles;
          void persistStore();
          return res.status(200).json({ success: true, ecotheology: store.ecotheology });
        }
        return res.status(400).json({ error: 'Data artikel ekoteologi tidak valid.' });
      }

      case 'save_thread': {
        const { threadId, userId: savingUserId } = payload || {};
        if (!threadId || !savingUserId) {
          return res.status(400).json({ error: 'threadId dan userId diperlukan.' });
        }

        const thread = store.threads.find((t) => t.id === threadId);
        if (thread) {
          thread.savedBy = Array.isArray(thread.savedBy) ? thread.savedBy : [];
          const hasSaved = thread.savedBy.includes(savingUserId);
          if (hasSaved) {
            thread.savedBy = thread.savedBy.filter((id) => id !== savingUserId);
          } else {
            thread.savedBy = Array.from(new Set([...thread.savedBy, savingUserId]));
          }
          void persistStore();
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
          void persistStore();
        }
        return res.status(200).json({ success: true, threads: store.threads });
      }

      case 'delete_thread': {
        const { threadId } = payload || {};
        store.threads = store.threads.filter((t) => t.id !== threadId);
        void persistStore();
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
        void persistStore();

        return res.status(200).json({ success: true, cheers: store.cheers });
      }

      case 'submit_challenge': {
        const submission: ChallengeSubmission = payload;
        if (!submission || !submission.id) {
          return res.status(400).json({ error: 'Data submission tidak valid.' });
        }
        store.submissions = [submission, ...store.submissions.filter((s) => s.id !== submission.id)];
        void persistStore();
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
        void persistStore();
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
        void persistStore();
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
