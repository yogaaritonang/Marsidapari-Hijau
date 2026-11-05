import { config } from 'dotenv';
import { createClient, User } from '@supabase/supabase-js';

config({ path: '.env.local' });
config();

const applyChanges = process.argv.includes('--apply');
const pageSize = 1000;
const mediaBuckets = ['profile-photos', 'mh-challenge-proofs', 'mh-user-media'] as const;

function requireEnvironment(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Environment ${name} harus diatur secara lokal sebelum menjalankan pembersihan.`);
  return value;
}

function missingRelation(error: { code?: string; message?: string }): boolean {
  return error.code === 'PGRST205' || error.code === '42P01';
}

async function loadAllUsers(): Promise<User[]> {
  const users: User[] = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: pageSize });
    if (error) throw new Error(`Gagal membaca daftar akun: ${error.message}`);
    users.push(...data.users);
    if (data.users.length < pageSize) return users;
  }
}

async function loadRows<T>(table: string, columns: string): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.from(table).select(columns).range(offset, offset + pageSize - 1);
    if (error) {
      if (missingRelation(error)) {
        console.warn(`Lewati tabel ${table}: belum tersedia di project Supabase.`);
        return [];
      }
      throw new Error(`Gagal membaca ${table}: ${error.message}`);
    }
    const page = (data || []) as T[];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

async function listFiles(bucket: string, path = ''): Promise<string[]> {
  const files: string[] = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await supabase.storage.from(bucket).list(path, {
      limit: 100,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) {
      if (error.message.toLowerCase().includes('bucket not found')) {
        console.warn(`Lewati bucket ${bucket}: belum tersedia di project Supabase.`);
        return [];
      }
      throw new Error(`Gagal memeriksa foto di ${bucket}/${path}: ${error.message}`);
    }

    for (const item of data || []) {
      const itemPath = path ? `${path}/${item.name}` : item.name;
      if (item.id) {
        files.push(itemPath);
      } else {
        files.push(...await listFiles(bucket, itemPath));
      }
    }
    if (!data || data.length < 100) return files;
  }
}

async function removeFiles(bucket: string, paths: string[]): Promise<number> {
  let removed = 0;
  for (let offset = 0; offset < paths.length; offset += 100) {
    const batch = paths.slice(offset, offset + 100);
    const { error } = await supabase.storage.from(bucket).remove(batch);
    if (error) throw new Error(`Gagal menghapus foto di ${bucket}: ${error.message}`);
    removed += batch.length;
  }
  return removed;
}

async function removeUserRows(table: string, column: string, userIds: string[]): Promise<number> {
  let removed = 0;
  for (let offset = 0; offset < userIds.length; offset += 100) {
    const ids = userIds.slice(offset, offset + 100);
    const { data, error } = await supabase.from(table).delete().in(column, ids).select(column);
    if (error) {
      if (missingRelation(error)) {
        console.warn(`Lewati tabel ${table}: belum tersedia di project Supabase.`);
        return removed;
      }
      throw new Error(`Gagal membersihkan ${table}: ${error.message}`);
    }
    removed += data?.length || 0;
  }
  return removed;
}

const supabaseUrl = requireEnvironment(
  'SUPABASE_URL atau VITE_SUPABASE_URL',
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
);
const serviceRoleKey = requireEnvironment('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY);
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main(): Promise<void> {
  const allUsers = await loadAllUsers();
  const users = allUsers.filter((user) => user.app_metadata?.role !== 'admin');
  const userIds = users.map((user) => user.id);
  if (userIds.length === 0) {
    console.log('Tidak ada akun non-admin yang perlu dibersihkan.');
    return;
  }

  const profiles = await loadRows<{ user_id: string }>('mh_user_profiles', 'user_id');
  const memberships = await loadRows<{ user_id: string }>('mh_community_memberships', 'user_id');
  const submissions = await loadRows<{ user_id: string }>('mh_submissions', 'user_id');
  const cheers = await loadRows<{ target_user_id: string; sender_user_id: string }>(
    'mh_leaderboard_cheers',
    'target_user_id,sender_user_id',
  );
  const registrations = await loadRows<{ user_id: string }>('mh_event_registrations', 'user_id');
  const notifications = await loadRows<{
    sender_user_id: string;
    recipient_user_id: string | null;
    is_broadcast: boolean;
  }>('mh_social_notifications', 'sender_user_id,recipient_user_id,is_broadcast');
  const publicProfiles = await loadRows<{ user_id: string }>('mh_public_profiles', 'user_id');
  const records = await loadRows<{
    collection: string;
    record_id: string;
    owner_id: string | null;
    payload: Record<string, unknown>;
  }>('mh_records', 'collection,record_id,owner_id,payload');

  const registeredIds = new Set(userIds);
  const userRecords = records.filter((row) =>
    ['threads', 'reports', 'locations'].includes(row.collection) &&
    (
      (row.owner_id && registeredIds.has(row.owner_id)) ||
      (typeof row.payload.userId === 'string' && registeredIds.has(row.payload.userId)) ||
      (typeof row.payload.submittedBy === 'string' && registeredIds.has(row.payload.submittedBy))
    ),
  );
  const threads = userRecords.filter((row) => row.collection === 'threads');
  const removableRecords = userRecords.filter((row) => row.collection !== 'threads');
  const deletedThreadIds = new Set(threads.map((row) => row.record_id));
  const threadInteractionUpdates = records.flatMap((row) => {
    if (row.collection !== 'threads' || deletedThreadIds.has(row.record_id) || row.payload._deleted === true) return [];
    const likedBy = Array.isArray(row.payload.likedBy) ? row.payload.likedBy : null;
    const savedBy = Array.isArray(row.payload.savedBy) ? row.payload.savedBy : null;
    const replies = Array.isArray(row.payload.replies) ? row.payload.replies : null;
    const cleanLikedBy = likedBy?.filter((id) => typeof id !== 'string' || !registeredIds.has(id));
    const cleanSavedBy = savedBy?.filter((id) => typeof id !== 'string' || !registeredIds.has(id));
    const cleanReplies = replies?.filter((reply) =>
      !reply || typeof reply !== 'object' || Array.isArray(reply) ||
      typeof reply.userId !== 'string' || !registeredIds.has(reply.userId)
    );
    const removedInteractions =
      (likedBy?.length || 0) - (cleanLikedBy?.length || 0) +
      (savedBy?.length || 0) - (cleanSavedBy?.length || 0) +
      (replies?.length || 0) - (cleanReplies?.length || 0);
    if (removedInteractions === 0) return [];

    return [{
      recordId: row.record_id,
      removedInteractions,
      payload: {
        ...row.payload,
        ...(cleanLikedBy ? { likedBy: cleanLikedBy, likes: cleanLikedBy.length } : {}),
        ...(cleanSavedBy ? { savedBy: cleanSavedBy } : {}),
        ...(cleanReplies ? { replies: cleanReplies } : {}),
      },
    }];
  });

  const storageCandidates = new Map<string, string[]>();
  for (const bucket of mediaBuckets) {
    const paths = (await listFiles(bucket)).filter((path) => registeredIds.has(path.split('/')[0]));
    storageCandidates.set(bucket, paths);
  }

  const galleryFiles = (await listFiles('community-gallery')).filter((path) => {
    const [, uploadedBy] = path.split('/');
    return users.some((user) => uploadedBy?.startsWith(`${user.id}--`));
  });
  storageCandidates.set('community-gallery', galleryFiles);

  const counts = {
    nonAdminAccounts: users.length,
    profiles: profiles.filter((row) => registeredIds.has(row.user_id)).length,
    memberships: memberships.filter((row) => registeredIds.has(row.user_id)).length,
    submissions: submissions.filter((row) => registeredIds.has(row.user_id)).length,
    cheers: cheers.filter((row) => registeredIds.has(row.target_user_id) || registeredIds.has(row.sender_user_id)).length,
    eventRegistrations: registrations.filter((row) => registeredIds.has(row.user_id)).length,
    notifications: notifications.filter((row) =>
      !row.is_broadcast &&
      (registeredIds.has(row.sender_user_id) || (row.recipient_user_id && registeredIds.has(row.recipient_user_id)))
    ).length,
    publicProfiles: publicProfiles.filter((row) => registeredIds.has(row.user_id)).length,
    userThreads: threads.length,
    threadInteractions: threadInteractionUpdates.reduce((total, row) => total + row.removedInteractions, 0),
    userReportsAndLocations: removableRecords.length,
    photos: Object.fromEntries([...storageCandidates].map(([bucket, paths]) => [bucket, paths.length])),
  };

  console.log(JSON.stringify(counts, null, 2));
  if (!applyChanges) {
    console.log('Mode simulasi: tidak ada data yang dihapus. Tinjau jumlah di atas, lalu jalankan lagi dengan --apply jika sesuai.');
    return;
  }

  const resetAt = new Date().toISOString();
  for (const row of threadInteractionUpdates) {
    const { error } = await supabase
      .from('mh_records')
      .update({ payload: row.payload, updated_at: resetAt })
      .eq('collection', 'threads')
      .eq('record_id', row.recordId);
    if (error) throw new Error(`Gagal membersihkan interaksi utas ${row.recordId}: ${error.message}`);
  }

  for (let offset = 0; offset < threads.length; offset += 100) {
    const batch = threads.slice(offset, offset + 100);
    const { error } = await supabase
      .from('mh_records')
      .delete()
      .eq('collection', 'threads')
      .in('record_id', batch.map((row) => row.record_id));
    if (error) throw new Error(`Gagal menghapus utas pengguna: ${error.message}`);
  }

  for (let offset = 0; offset < removableRecords.length; offset += 100) {
    const batch = removableRecords.slice(offset, offset + 100);
    for (const row of batch) {
      const { error } = await supabase
        .from('mh_records')
        .delete()
        .eq('collection', row.collection)
        .eq('record_id', row.record_id);
      if (error) throw new Error(`Gagal menghapus ${row.collection}/${row.record_id}: ${error.message}`);
    }
  }

  const removedRows = {
    profiles: await removeUserRows('mh_user_profiles', 'user_id', userIds),
    memberships: await removeUserRows('mh_community_memberships', 'user_id', userIds),
    submissions: await removeUserRows('mh_submissions', 'user_id', userIds),
    cheersBySender: await removeUserRows('mh_leaderboard_cheers', 'sender_user_id', userIds),
    cheersByTarget: await removeUserRows('mh_leaderboard_cheers', 'target_user_id', userIds),
    eventRegistrations: await removeUserRows('mh_event_registrations', 'user_id', userIds),
    notificationsBySender: await removeUserRows('mh_social_notifications', 'sender_user_id', userIds),
    notificationsByRecipient: await removeUserRows('mh_social_notifications', 'recipient_user_id', userIds),
    publicProfiles: await removeUserRows('mh_public_profiles', 'user_id', userIds),
  };

  const { error: broadcastError } = await supabase
    .from('mh_social_notifications')
    .update({ read_by: [] })
    .eq('is_broadcast', true);
  if (broadcastError && !missingRelation(broadcastError)) {
    throw new Error(`Gagal mengatur ulang status notifikasi umum: ${broadcastError.message}`);
  }

  const removedPhotos: Record<string, number> = {};
  for (const [bucket, paths] of storageCandidates) {
    removedPhotos[bucket] = await removeFiles(bucket, paths);
  }

  for (const user of users) {
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: {},
      app_metadata: { ...user.app_metadata, data_reset_at: resetAt },
    });
    if (error) throw new Error(`Gagal menandai profil akun ${user.id} agar cache lama dibersihkan: ${error.message}`);
  }

  console.log(JSON.stringify({
    complete: true,
    removedRows,
    removedThreads: threads.length,
    removedThreadInteractions: counts.threadInteractions,
    removedRecords: removableRecords.length,
    removedPhotos,
  }, null, 2));
  console.log('Akun non-admin dan akun pemimpin tetap aktif. Akun admin, data CRUD admin, serta konten aplikasi admin tidak dihapus.');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
