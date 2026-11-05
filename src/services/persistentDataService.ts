import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppNotification, ChallengeSubmission, GardenState, User } from '../types';
import { StorageService } from './storageService';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/+$/, '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface StoredUserProfile {
  community_id: string;
  profile: User;
  garden: GardenState | null;
  favorite_devotion_ids: string[];
}

interface StoredSubmission {
  id: string;
  user_id: string;
  community_id: string;
  verdict: ChallengeSubmission['verdict'];
  awarded_points: number;
  submitted_at: string;
  payload: ChallengeSubmission;
}

let client: SupabaseClient | null = null;
let tokenUsedForClient: string | null = null;
const lastProfileSync = new Map<string, string>();

async function getClient(): Promise<SupabaseClient> {
  const { AuthService } = await import('./authService');
  const token = await AuthService.getAccessToken();
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Konfigurasi Supabase belum tersedia.');
  }
  if (!token) {
    throw new Error('Sesi login tidak ditemukan. Silakan masuk kembali untuk menyimpan data.');
  }
  if (!client || tokenUsedForClient !== token) {
    tokenUsedForClient = token;
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
  }
  return client;
}

async function assertActiveAccount(expectedUserId: string): Promise<void> {
  const { AuthService } = await import('./authService');
  const authUser = await AuthService.getCurrentUser();
  if (!authUser) throw new Error('Sesi Supabase tidak aktif. Silakan masuk kembali.');
  if (authUser.id !== expectedUserId) {
    throw new Error('Akun aplikasi berbeda dengan sesi Supabase. Keluar lalu masuk kembali sebelum menyimpan data.');
  }
}

function emitCloudError(error: unknown): void {
  const message = error instanceof Error ? error.message : 'Gagal menyimpan data ke Supabase.';
  window.dispatchEvent(new CustomEvent('mh-shared-sync-status', {
    detail: { state: 'error', message },
  }));
  console.error('[PersistentDataService]', error);
}

function profileSyncSnapshot(user: User, garden: GardenState): string {
  return JSON.stringify({ user, garden });
}

export class PersistentDataService {
  static async uploadUserImage(dataUrl: string, userId: string, recordId: string): Promise<string> {
    if (!dataUrl.startsWith('data:')) return dataUrl;
    await assertActiveAccount(userId);
    const imageResponse = await fetch(dataUrl);
    const image = await imageResponse.blob();
    if (image.size > 5 * 1024 * 1024) {
      throw new Error('Foto melebihi batas ukuran 5 MB.');
    }
    const db = await getClient();
    const extension = image.type === 'image/png' ? 'png' : image.type === 'image/webp' ? 'webp' : 'jpg';
    const safeId = recordId.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${userId}/${safeId}.${extension}`;
    const { error } = await db.storage
      .from('mh-user-media')
      .upload(path, image, { contentType: image.type || 'image/jpeg', upsert: true });
    if (error) throw new Error(`Foto gagal disimpan: ${error.message}`);
    return db.storage.from('mh-user-media').getPublicUrl(path).data.publicUrl;
  }

  static async syncUserProfile(user: User): Promise<User> {
    const db = await getClient();
    const { data, error } = await db
      .from('mh_user_profiles')
      .select('community_id,profile,garden,favorite_devotion_ids')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw new Error(`Profil cloud gagal dimuat: ${error.message}`);
    if (!data) {
      const cachedUser = StorageService.getCachedUser();
      const isSameAccount = cachedUser.id === user.id;
      const cachedGarden = isSameAccount ? StorageService.getGardenState() : null;
      StorageService.applyPersistentUserSnapshot(user, cachedGarden);
      if (!isSameAccount) StorageService.applyFavoriteDevotions([]);
      await this.saveUserProfile(user);
      return user;
    }

    const stored = data as StoredUserProfile;
    const profile = stored.profile && typeof stored.profile === 'object' ? stored.profile : user;
    const hydrated: User = {
      ...user,
      ...profile,
      id: user.id,
      role: user.role,
      contact: profile.contact || user.contact,
      communityId: stored.community_id || user.communityId,
    };
    StorageService.applyPersistentUserSnapshot(hydrated, stored.garden || null);
    StorageService.applyFavoriteDevotions(stored.favorite_devotion_ids || []);
    lastProfileSync.set(
      user.id,
      profileSyncSnapshot(hydrated, stored.garden || StorageService.getGardenState()) +
        JSON.stringify(stored.favorite_devotion_ids || []),
    );
    return hydrated;
  }

  static async saveUserProfile(user: User): Promise<void> {
    if (!user.id || user.id === 'guest-preview') return;
    const garden = StorageService.getGardenState();
    const favoriteDevotionIds = StorageService.getDevotions()
      .filter((devotion) => devotion.isFavorite)
      .map((devotion) => devotion.id);
    const snapshot = profileSyncSnapshot(user, garden) + JSON.stringify(favoriteDevotionIds);
    if (lastProfileSync.get(user.id) === snapshot) return;

    try {
      const db = await getClient();
      const { error } = await db.from('mh_user_profiles').upsert({
        user_id: user.id,
        community_id: user.communityId || 'umum',
        profile: user,
        garden,
        favorite_devotion_ids: favoriteDevotionIds,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      if (error) throw new Error(`Profil gagal disimpan: ${error.message}`);
      lastProfileSync.set(user.id, snapshot);
    } catch (error) {
      emitCloudError(error);
      throw error;
    }
  }

  static async saveGarden(garden: GardenState): Promise<void> {
    const user = StorageService.getCachedUser();
    if (!user.id || user.id === 'guest-preview') return;
    const db = await getClient();
    const { data: existing, error: readError } = await db
      .from('mh_user_profiles')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (readError) throw new Error(`Profil cloud gagal diperiksa: ${readError.message}`);
    if (!existing) {
      lastProfileSync.delete(user.id);
      await this.saveUserProfile(user);
    }
    const { error } = await db
      .from('mh_user_profiles')
      .update({ garden, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);
    if (error) throw new Error(`Progres kebun gagal disimpan: ${error.message}`);
  }

  static async saveFavoriteDevotions(ids: string[]): Promise<void> {
    const user = StorageService.getCachedUser();
    if (!user.id || user.id === 'guest-preview') return;
    const db = await getClient();
    const { data: existing, error: readError } = await db
      .from('mh_user_profiles')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (readError) throw new Error(`Profil cloud gagal diperiksa: ${readError.message}`);
    if (!existing) {
      lastProfileSync.delete(user.id);
      await this.saveUserProfile(user);
    }
    const { error } = await db
      .from('mh_user_profiles')
      .update({ favorite_devotion_ids: ids, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);
    if (error) throw new Error(`Renungan favorit gagal disimpan: ${error.message}`);
  }

  static async syncMembership(user: User): Promise<void> {
    if (!user.id || user.id === 'guest-preview' || !user.communityId) return;
    const db = await getClient();
    const { error } = await db.from('mh_community_memberships').upsert({
      user_id: user.id,
      community_id: user.communityId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    if (error) throw new Error(`Keanggotaan komunitas gagal disimpan: ${error.message}`);
    await this.refreshCommunityMemberCounts();
  }

  static async refreshCommunityMemberCounts(): Promise<void> {
    const db = await getClient();
    const { data, error } = await db.rpc('mh_community_member_counts');
    if (error) throw new Error(`Jumlah anggota komunitas gagal dimuat: ${error.message}`);
    const counts: Record<string, number> = {};
    for (const row of data || []) {
      if (typeof row.community_id === 'string' && Number.isFinite(Number(row.member_count))) {
        counts[row.community_id] = Number(row.member_count);
      }
    }
    StorageService.applyRegisteredMemberCounts(counts);
  }

  static async syncSubmissions(): Promise<void> {
    const db = await getClient();
    const remoteRows: StoredSubmission[] = [];
    const pageSize = 1000;
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await db
        .from('mh_submissions')
        .select('id,user_id,community_id,verdict,awarded_points,submitted_at,payload')
        .order('submitted_at', { ascending: false })
        .range(offset, offset + pageSize - 1);
      if (error) throw new Error(`Daftar aksi gagal dimuat: ${error.message}`);
      const page = (data || []) as StoredSubmission[];
      remoteRows.push(...page);
      if (page.length < pageSize) break;
    }

    const remote = new Map<string, ChallengeSubmission>();
    for (const row of remoteRows) {
      if (row.payload && row.id) remote.set(row.id, row.payload);
    }

    const activeUserId = StorageService.getCachedUser().id;
    for (const submission of StorageService.getSubmissions()) {
      if (submission.userId === activeUserId && !remote.has(submission.id)) {
        try {
          const saved = await this.saveSubmission(submission);
          if (saved) remote.set(saved.id, saved);
        } catch (saveError) {
          emitCloudError(saveError);
        }
      }
    }

    const merged = new Map<string, ChallengeSubmission>();
    for (const submission of StorageService.getSubmissions()) {
      if (submission.userId === activeUserId) merged.set(submission.id, submission);
    }
    for (const [id, submission] of remote) merged.set(id, submission);
    StorageService.saveSubmissions([...merged.values()]);
  }

  static async saveSubmission(submission: ChallengeSubmission): Promise<ChallengeSubmission | null> {
    const user = StorageService.getCachedUser();
    if (!user.id || user.id === 'guest-preview') throw new Error('Silakan masuk untuk menyimpan aksi.');
    await assertActiveAccount(user.id);
    const db = await getClient();
    const { data: existing, error: existingError } = await db
      .from('mh_submissions')
      .select('id,user_id,payload')
      .eq('id', submission.id)
      .maybeSingle();
    if (existingError) throw new Error(`Status aksi gagal diperiksa: ${existingError.message}`);

    const isOwner = user.id === submission.userId;
    const canReview = user.role === 'admin' || user.role === 'pemimpin';
    if (!isOwner && (!existing || !canReview)) {
      throw new Error('Aksi hanya dapat disimpan oleh pengirim atau peninjau yang berwenang.');
    }

    let payload = submission;
    if (isOwner && payload.imageThumbnail.startsWith('data:')) {
      const imageResponse = await fetch(payload.imageThumbnail);
      const image = await imageResponse.blob();
      if (image.size > 2 * 1024 * 1024) {
        throw new Error('Foto bukti melebihi batas ukuran 2 MB.');
      }
      const extension = image.type === 'image/png' ? 'png' : image.type === 'image/webp' ? 'webp' : 'jpg';
      const safeId = submission.id.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${user.id}/${safeId}.${extension}`;
      const { error: uploadError } = await db.storage
        .from('mh-challenge-proofs')
        .upload(path, image, { contentType: image.type || 'image/jpeg', upsert: true });
      if (uploadError) throw new Error(`Foto bukti gagal disimpan: ${uploadError.message}`);
      payload = {
        ...submission,
        imageThumbnail: db.storage.from('mh-challenge-proofs').getPublicUrl(path).data.publicUrl,
      };
    }

    const row = {
      id: payload.id,
      user_id: user.id,
      community_id: payload.userCommunityId || user.communityId || 'umum',
      verdict: payload.verdict,
      awarded_points: payload.awardedPoints,
      submitted_at: payload.submittedAt,
      payload,
      updated_at: new Date().toISOString(),
    };
    if (existing) {
      if (existing.user_id === user.id) return existing.payload as ChallengeSubmission;
      const { data: reviewed, error: reviewError } = await db
        .from('mh_submissions')
        .update({
          verdict: payload.verdict,
          awarded_points: payload.awardedPoints,
          payload,
          updated_at: new Date().toISOString(),
          reviewed_by: user.id,
        })
        .eq('id', payload.id)
        .select('payload')
        .maybeSingle();
      if (reviewError) throw new Error(`Hasil peninjauan gagal disimpan: ${reviewError.message}`);
      return (reviewed?.payload as ChallengeSubmission | undefined) || null;
    }

    const { error: insertError } = await db.from('mh_submissions').insert(row);
    if (insertError) {
      if (insertError.code === '23505') return null;
      throw new Error(`Aksi gagal disimpan: ${insertError.message}`);
    }
    return payload;
  }

  static async syncEventRegistrations(): Promise<void> {
    const user = StorageService.getCachedUser();
    if (!user.id || user.id === 'guest-preview') return;
    const db = await getClient();
    const [countsResult, registrationsResult] = await Promise.all([
      db.rpc('mh_event_registration_counts'),
      db
      .from('mh_event_registrations')
      .select('event_id,user_id')
      .eq('user_id', user.id),
    ]);
    if (countsResult.error) throw new Error(`Jumlah peserta kegiatan gagal dimuat: ${countsResult.error.message}`);
    if (registrationsResult.error) throw new Error(`Pendaftaran kegiatan gagal dimuat: ${registrationsResult.error.message}`);

    const counts = new Map<string, number>();
    const registered = new Set<string>();
    for (const row of countsResult.data || []) {
      counts.set(row.event_id, Number(row.registration_count));
    }
    for (const row of registrationsResult.data || []) {
      if (row.user_id === user.id) registered.add(row.event_id);
    }
    StorageService.applyEventRegistrationSnapshot(counts, registered);
  }

  static async toggleEventRegistration(eventId: string): Promise<void> {
    const user = StorageService.getCachedUser();
    if (!user.id || user.id === 'guest-preview') {
      throw new Error('Silakan masuk untuk mendaftar kegiatan.');
    }
    const db = await getClient();
    const { data: existing, error: readError } = await db
      .from('mh_event_registrations')
      .select('event_id')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (readError) throw new Error(`Status pendaftaran gagal diperiksa: ${readError.message}`);
    const result = existing
      ? await db.from('mh_event_registrations').delete().eq('event_id', eventId).eq('user_id', user.id)
      : await db.from('mh_event_registrations').insert({ event_id: eventId, user_id: user.id });
    if (result.error) throw new Error(`Pendaftaran kegiatan gagal disimpan: ${result.error.message}`);
    await this.syncEventRegistrations();
  }

  static async loadNotifications(userId: string): Promise<AppNotification[]> {
    const db = await getClient();
    const [directResult, broadcastResult] = await Promise.all([
      db
        .from('mh_social_notifications')
        .select('payload,is_read,is_broadcast,read_by')
        .eq('recipient_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100),
      db
        .from('mh_social_notifications')
        .select('payload,is_read,is_broadcast,read_by')
        .eq('is_broadcast', true)
        .order('created_at', { ascending: false })
        .limit(100),
    ]);
    if (directResult.error) throw new Error(`Notifikasi akun gagal dimuat: ${directResult.error.message}`);
    if (broadcastResult.error) throw new Error(`Notifikasi umum gagal dimuat: ${broadcastResult.error.message}`);
    const currentUserId = StorageService.getCachedUser().id;
    return [...(directResult.data || []), ...(broadcastResult.data || [])]
      .map((row) => ({
        ...(row.payload as AppNotification),
        recipientUserId: row.is_broadcast ? currentUserId : (row.payload as AppNotification).recipientUserId,
        read: row.is_broadcast
          ? (row.read_by as string[]).includes(currentUserId)
          : row.is_read,
      }))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, 100);
  }

  static async saveNotification(notification: AppNotification): Promise<void> {
    const isBroadcast = notification.recipientUserId === 'all';
    if (!isBroadcast && (!notification.recipientUserId || notification.recipientUserId === 'guest-preview')) return;
    const db = await getClient();
    const { error } = await db.from('mh_social_notifications').upsert({
      id: notification.id,
      recipient_user_id: isBroadcast ? null : notification.recipientUserId,
      sender_user_id: notification.senderUserId,
      payload: notification,
      is_read: notification.read,
      is_broadcast: isBroadcast,
      created_at: notification.createdAt,
    }, { onConflict: 'id', ignoreDuplicates: true });
    if (error) throw new Error(`Notifikasi gagal disimpan: ${error.message}`);
  }

  static async markNotificationsRead(userId: string, notificationId?: string): Promise<void> {
    if (userId !== StorageService.getCachedUser().id) {
      throw new Error('Anda hanya dapat mengubah status notifikasi akun sendiri.');
    }
    const db = await getClient();
    const { error } = await db.rpc('mh_mark_notifications_read', {
      notification_ids: notificationId ? [notificationId] : null,
    });
    if (error) throw new Error(`Status notifikasi gagal disimpan: ${error.message}`);
  }

  static async loadCheers(): Promise<Record<string, { count: number; users: string[] }>> {
    const db = await getClient();
    const { data, error } = await db.rpc('mh_leaderboard_cheer_counts');
    if (error) throw new Error(`Apresiasi peringkat gagal dimuat: ${error.message}`);
    const cheers: Record<string, { count: number; users: string[] }> = {};
    for (const row of data || []) {
      cheers[row.target_user_id] = {
        count: Number(row.cheer_count),
        users: row.cheered_by_current_user ? [StorageService.getCachedUser().id] : [],
      };
    }
    return cheers;
  }

  static async toggleCheer(targetUserId: string, senderUserId: string): Promise<Record<string, { count: number; users: string[] }>> {
    const db = await getClient();
    const currentUserId = StorageService.getCachedUser().id;
    await assertActiveAccount(currentUserId);
    if (senderUserId !== currentUserId) {
      throw new Error('Akun pengirim apresiasi tidak sama dengan akun yang sedang masuk.');
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetUserId)) {
      throw new Error('ID anggota pada peringkat bukan ID akun Supabase yang valid.');
    }
    if (targetUserId === currentUserId) throw new Error('Anda tidak dapat mengirim apresiasi ke akun sendiri.');
    const { error } = await db.rpc('mh_toggle_leaderboard_cheer', {
      p_target_user_id: targetUserId,
    });
    if (error) throw new Error(`Apresiasi gagal disimpan: ${error.message}`);
    return this.loadCheers();
  }
}
