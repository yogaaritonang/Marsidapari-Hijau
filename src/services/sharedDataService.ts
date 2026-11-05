import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import {
  Challenge,
  ChallengeSubmission,
  Community,
  Devotion,
  EnvironmentalReport,
  GreenEvent,
  MapMarkerLocation,
  User,
} from '../types';
import { StorageService } from './storageService';
import { PushNotificationService } from './pushNotificationService';

export type SharedCollection =
  | 'brand'
  | 'challenges'
  | 'communities'
  | 'devotions'
  | 'events'
  | 'locations'
  | 'reports'
  | 'threads'
  | 'ecotheology';

export type SyncState = 'connecting' | 'synced' | 'error' | 'offline';

export interface SharedRecord {
  collection: SharedCollection;
  record_id: string;
  owner_id?: string | null;
  organization_id: string | null;
  payload: Record<string, unknown>;
  updated_at?: string;
}

export interface OrganizationRecord {
  id: string;
  name: string;
  category: string;
  location: string;
  owner_id: string;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/+$/, '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const recordCollections: SharedCollection[] = [
  'brand',
  'challenges',
  'communities',
  'devotions',
  'events',
  'locations',
  'reports',
  'threads',
  'ecotheology',
];

let activeUser: User | null = null;
let latestUser: User | null = null;
let accessToken: string | null = null;
let baseline = new Map<string, string>();
let baselineOwners = new Map<string, string | null>();
let baselineOrganizations = new Map<string, string | null>();
let queue = Promise.resolve();
let supabaseClient: SupabaseClient | null = null;
let realtimeChannel: RealtimeChannel | null = null;
let isApplyingRemoteChange = false;

function emitStatus(state: SyncState, message?: string) {
  window.dispatchEvent(new CustomEvent('mh-shared-sync-status', { detail: { state, message } }));
}

function makeKey(collection: SharedCollection, id: string): string {
  return `${collection}:${id}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isMapLocation(value: unknown): value is MapMarkerLocation {
  if (!isRecord(value) || !Array.isArray(value.coordinates) || value.coordinates.length !== 2) return false;
  const [latitude, longitude] = value.coordinates;
  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.address === 'string' &&
    typeof value.description === 'string' &&
    ['bank_sampah', 'tanam_pohon', 'bersih_danau', 'mata_air'].includes(String(value.category)) &&
    typeof latitude === 'number' &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    typeof longitude === 'number' &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function rowId(value: unknown): string | null {
  if (!isRecord(value) || typeof value.id !== 'string' || value.id.length === 0) return null;
  return value.id;
}

function storedRecords(collection: SharedCollection): unknown[] {
  switch (collection) {
    case 'brand':
      return [{ id: 'global', ...StorageService.getBrandSettings() }];
    case 'challenges':
      return StorageService.getChallenges();
    case 'communities':
      return StorageService.getCommunities();
    case 'devotions':
      return StorageService.getDevotions();
    case 'events':
      return StorageService.getEvents();
    case 'locations':
      return StorageService.getMapLocations();
    case 'reports':
      return StorageService.getReports();
    case 'threads':
      return StorageService.getThreads();
    case 'ecotheology':
      return StorageService.getEcotheologyArticles();
  }
}

function saveCollection(collection: SharedCollection, values: unknown[]) {
  switch (collection) {
    case 'brand': {
      const brand = values.find((value) => isRecord(value) && value.id === 'global');
      if (isRecord(brand)) {
        StorageService.applySharedSnapshot(collection, brand);
      }
      break;
    }
    case 'challenges':
    case 'communities':
    case 'devotions':
    case 'events':
    case 'locations':
    case 'reports':
    case 'threads':
    case 'ecotheology':
      StorageService.applySharedSnapshot(collection, values);
      break;
  }
}

function snapshotValue(collection: SharedCollection, value: unknown): string {
  return JSON.stringify(value);
}

function recordPayload(collection: SharedCollection, value: unknown): Record<string, unknown> {
  if (!isRecord(value)) return {};
  if (collection !== 'locations') return value;
  const { submittedBy: _submittedBy, ...payload } = value;
  return payload;
}

function canWrite(collection: SharedCollection): boolean {
  if (!activeUser) return false;
  if (collection === 'threads') return true;
  if (activeUser.role === 'admin') return true;
  if (activeUser.role === 'pemimpin') {
    return collection === 'events' || collection === 'locations' || collection === 'reports' || collection === 'communities';
  }
  return collection === 'locations' || collection === 'reports';
}

function recordOrganization(collection: SharedCollection): string | null {
  if (collection === 'events' || collection === 'reports') return activeUser?.communityId || null;
  if (collection === 'communities') return activeUser?.communityId || null;
  if (collection === 'threads' || collection === 'ecotheology') return activeUser?.communityId || null;
  return null;
}

function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      },
    });
  }
  return supabaseClient;
}

function refreshSupabaseClient(token: string | null): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  accessToken = token;
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  });
  return supabaseClient;
}

async function loadOrganizations(): Promise<OrganizationRecord[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  const { data, error } = await client
    .from('mh_organizations')
    .select('id,name,category,location,owner_id')
    .order('name', { ascending: true });
  if (error) {
    console.warn('[SharedDataService] Gagal memuat mh_organizations:', error.message);
    emitStatus('error', `Gagal memuat komunitas dari Supabase: ${error.message}`);
    throw new Error(`Gagal memuat komunitas dari Supabase: ${error.message}`);
  }
  return (data || []) as OrganizationRecord[];
}

async function loadSharedRecords(
  client: SupabaseClient,
  collection?: SharedCollection,
): Promise<SharedRecord[]> {
  const pageSize = 1000;
  const records: SharedRecord[] = [];
  for (let offset = 0; ; offset += pageSize) {
    let query = client
      .from('mh_records')
      .select('collection,record_id,owner_id,organization_id,payload')
      .order('collection', { ascending: true })
      .order('record_id', { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (collection) query = query.eq('collection', collection);
    const { data, error } = await query;
    if (error) throw new Error(`Gagal memuat data aplikasi dari Supabase: ${error.message}`);
    const page = (data || []) as SharedRecord[];
    records.push(...page);
    if (page.length < pageSize) break;
  }
  return records;
}

function mergeOrganizations(organizations: OrganizationRecord[]) {
  const local = StorageService.getCommunities();
  const byId = new Map(local.map((community) => [community.id, community]));
  for (const organization of organizations) {
    const existing = byId.get(organization.id);
    byId.set(organization.id, {
      id: organization.id,
      name: organization.name,
      category: organization.category as 'Kampus' | 'Gereja' | 'Pemuda' | 'Komunitas Warga',
      location: organization.location,
      memberCount: existing?.memberCount ?? 1,
      totalPoints: existing?.totalPoints ?? 0,
      treesPlanted: existing?.treesPlanted ?? 0,
      treeTarget: existing?.treeTarget ?? 200,
      actionCount: existing?.actionCount ?? 0,
      actionTarget: existing?.actionTarget ?? 500,
      description: existing?.description ?? 'Organisasi hijau Marsiadapari Hijau.',
    });
  }
  const mergedList = [...byId.values()];
  StorageService.applySharedSnapshot('communities', mergedList);
}

/**
 * Tangani perubahan real-time dari tabel Supabase mh_records
 */
function handleRemoteRecordChange(change: {
  eventType: string;
  new: Record<string, unknown> | null;
  old: Record<string, unknown> | null;
}) {
  const newRow = change.new as Partial<SharedRecord> | null;
  const oldRow = change.old as Partial<SharedRecord> | null;
  const collection = (newRow?.collection || oldRow?.collection) as SharedCollection | undefined;
  const recordId = (newRow?.record_id || oldRow?.record_id) as string | undefined;

  if (!collection || !recordId || !recordCollections.includes(collection)) return;

  const payload = newRow?.payload as Record<string, unknown> | undefined;
  const isDeleted = change.eventType === 'DELETE' || payload?._deleted === true;

  isApplyingRemoteChange = true;
  try {
    if (collection === 'brand') {
      if (payload && !isDeleted) {
        StorageService.saveBrandSettings(payload as any);
        window.dispatchEvent(new CustomEvent('mh-brand-updated', { detail: payload }));
      }
      return;
    }

    const current = storedRecords(collection);
    let updated: unknown[];

    if (isDeleted) {
      updated = current.filter((item) => rowId(item) !== recordId);
      baseline.delete(makeKey(collection, recordId));
      baselineOwners.delete(makeKey(collection, recordId));
      baselineOrganizations.delete(makeKey(collection, recordId));
    } else if (payload) {
      const existingIndex = current.findIndex((item) => rowId(item) === recordId);
      if (existingIndex >= 0) {
        updated = [...current];
        updated[existingIndex] = payload;
      } else {
        updated = [payload, ...current];
        // Jika ada tantangan baru dari database real-time
        if (collection === 'challenges' && typeof payload.title === 'string') {
          PushNotificationService.notifyNewChallenge(payload as unknown as Challenge).catch(() => {});
        }
      }
      baseline.set(makeKey(collection, recordId), JSON.stringify(payload));
      baselineOwners.set(makeKey(collection, recordId), newRow?.owner_id || null);
      baselineOrganizations.set(makeKey(collection, recordId), newRow?.organization_id || null);
    } else {
      return;
    }

    saveCollection(collection, updated);
    window.dispatchEvent(new CustomEvent('mh-data-updated', { detail: { collection, values: updated } }));
  } finally {
    isApplyingRemoteChange = false;
  }
}

/**
 * Tangani perubahan real-time dari tabel Supabase mh_organizations
 */
function handleRemoteOrgChange(change: {
  eventType: string;
  new: Record<string, unknown> | null;
  old: Record<string, unknown> | null;
}) {
  const org = (change.new || change.old) as Partial<OrganizationRecord> | null;
  if (!org || !org.id) return;

  isApplyingRemoteChange = true;
  try {
    const current = StorageService.getCommunities();
    let updated: Community[];

    if (change.eventType === 'DELETE') {
      updated = current.filter((c) => c.id !== org.id);
    } else {
      const existing = current.find((c) => c.id === org.id);
      const merged: Community = {
        id: org.id,
        name: org.name || existing?.name || 'Komunitas Tanpa Nama',
        category: (org.category as Community['category']) || existing?.category || 'Komunitas Warga',
        location: org.location || existing?.location || 'Tapanuli Utara',
        memberCount: existing?.memberCount ?? 1,
        totalPoints: existing?.totalPoints ?? 0,
        treesPlanted: existing?.treesPlanted ?? 0,
        treeTarget: existing?.treeTarget ?? 200,
        actionCount: existing?.actionCount ?? 0,
        actionTarget: existing?.actionTarget ?? 500,
        description: existing?.description ?? 'Organisasi hijau Marsiadapari Hijau.',
      };
      const index = current.findIndex((c) => c.id === org.id);
      if (index >= 0) {
        updated = [...current];
        updated[index] = merged;
      } else {
        updated = [...current, merged];
      }
    }

    StorageService.applySharedSnapshot('communities', updated);
    window.dispatchEvent(new CustomEvent('mh-data-updated', { detail: { collection: 'communities', values: updated } }));
  } finally {
    isApplyingRemoteChange = false;
  }
}

function handleRemoteSubmissionChange(change: {
  eventType: string;
  new: Record<string, unknown> | null;
  old: Record<string, unknown> | null;
}) {
  const row = (change.new || change.old) as {
    id?: string;
    user_id?: string;
    payload?: ChallengeSubmission;
  } | null;
  if (!row?.id) return;

  const submissions = StorageService.getSubmissions().filter((item) => item.id !== row.id);
  if (change.eventType !== 'DELETE' && row.payload) submissions.unshift(row.payload);
  StorageService.saveSubmissions(submissions);

  if (row.user_id === activeUser?.id) {
    StorageService.reconcileUserPoints(StorageService.getUser());
  }
}

async function pushChanges(collection: SharedCollection, values: unknown[]) {
  if (isApplyingRemoteChange) return;
  if (!canWrite(collection)) return;
  const client = getSupabaseClient();
  if (!client) return;

  const current = new Map<string, unknown>();
  for (const value of values) {
    const id = rowId(value);
    if (id) current.set(id, value);
  }

  const changes: SharedRecord[] = [];
  for (const [id, value] of current) {
    const key = makeKey(collection, id);
    const serialized = snapshotValue(collection, value);
    if (baseline.get(key) === serialized) continue;

    const recordOwnerId =
      collection === 'threads' && isRecord(value) && typeof value.userId === 'string'
        ? value.userId
        : collection === 'reports'
        ? (activeUser?.id || null)
        : collection === 'locations' && isRecord(value) && typeof value.submittedBy === 'string'
        ? value.submittedBy
        : activeUser?.id || null;

    changes.push({
      collection,
      record_id: id,
      owner_id: recordOwnerId,
      organization_id: collection === 'threads' && baselineOrganizations.has(key)
        ? baselineOrganizations.get(key) || null
        : recordOrganization(collection),
      payload: recordPayload(collection, value),
    });
  }

  for (const [key] of baseline) {
    if (!key.startsWith(`${collection}:`)) continue;
    const id = key.slice(collection.length + 1);
    const ownerId = baselineOwners.get(key);
    const canDelete = activeUser?.role === 'admin' || (collection === 'threads' && ownerId === activeUser?.id);
    let alreadyDeleted = false;
    try {
      alreadyDeleted = JSON.parse(baseline.get(key) || 'null')?._deleted === true;
    } catch {
      alreadyDeleted = false;
    }
    if (canDelete && !current.has(id) && !alreadyDeleted) {
      const tombstone = {
        id,
        ...(collection === 'threads' && ownerId ? { userId: ownerId } : {}),
        _deleted: true,
      };
      changes.push({
        collection,
        record_id: id,
        owner_id: ownerId || activeUser?.id || null,
        organization_id: baselineOrganizations.get(key) || recordOrganization(collection),
        payload: tombstone,
      });
    }
  }

  if (changes.length === 0) return;
  try {
    const { error } = await client
      .from('mh_records')
      .upsert(changes, { onConflict: 'collection,record_id' });

    if (error) {
      console.warn(`[SharedDataService] pushChanges notice for ${collection}:`, error.message);
      throw new Error(`Sinkronisasi database gagal (${collection}): ${error.message}`);
    }

    for (const change of changes) {
      const key = makeKey(collection, change.record_id);
      baseline.set(
        key,
        snapshotValue(collection, current.get(change.record_id) ?? change.payload),
      );
      baselineOwners.set(key, change.owner_id || null);
      baselineOrganizations.set(key, change.organization_id);
    }
  } catch (err) {
    throw err;
  }
}

async function handleLocalChange(event: Event) {
  if (isApplyingRemoteChange) return;
  const detail = (event as CustomEvent<{ collection: SharedCollection; values: unknown[] }>).detail;
  if (!detail || !recordCollections.includes(detail.collection)) return;
  queue = queue.then(async () => {
    try {
      await pushChanges(detail.collection, detail.values);
      emitStatus('synced');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sinkronisasi database gagal.';
      emitStatus('error', message);
      console.warn('[SharedDataService] Database sync notice:', message);
    }
  });
  await queue;
}

export class SharedDataService {
  static isConfigured(): boolean {
    return Boolean(supabaseUrl && supabaseAnonKey);
  }

  static getClient(): SupabaseClient | null {
    return getSupabaseClient();
  }

  static updateActiveUser(user: User): void {
    latestUser = user;
    if (activeUser?.id === user.id) activeUser = user;
  }

  /**
   * Operasi UPSERT record langsung ke tabel mh_records di Supabase
   * Mengirim perubahan ke cloud database sehingga dapat dilihat publik/seluruh pengguna.
   */
  static async upsertRecord(
    collection: SharedCollection,
    recordId: string,
    payload: Record<string, unknown>,
    ownerId?: string | null,
    organizationId?: string | null,
  ): Promise<void> {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('Supabase belum terhubung. Perubahan belum tersimpan ke database.');
    }

    const sanitizedPayload = recordPayload(collection, payload);
    const resolvedOwnerId =
      ownerId !== undefined
        ? ownerId
        : collection === 'threads' && typeof payload.userId === 'string'
        ? payload.userId
        : activeUser?.id || null;
    const row: SharedRecord = {
      collection,
      record_id: recordId,
      owner_id: resolvedOwnerId,
      organization_id: organizationId !== undefined ? organizationId : recordOrganization(collection),
      payload: sanitizedPayload,
      updated_at: new Date().toISOString(),
    };

    const { error } = await client
      .from('mh_records')
      .upsert(row, { onConflict: 'collection,record_id' });

    if (error) {
      emitStatus('error', `Sinkronisasi Supabase gagal (${collection}): ${error.message}`);
      console.error(`[SharedDataService] Gagal upsert ${collection}:${recordId}:`, error);
      throw new Error(`Sinkronisasi Supabase gagal (${collection}): ${error.message}`);
    }

    baseline.set(makeKey(collection, recordId), snapshotValue(collection, payload));
    baselineOwners.set(makeKey(collection, recordId), resolvedOwnerId);
    baselineOrganizations.set(makeKey(collection, recordId), row.organization_id);
    emitStatus('synced');
  }

  static async flushCollection(collection: SharedCollection): Promise<void> {
    await pushChanges(collection, storedRecords(collection));
  }

  static async refreshCollection(collection: SharedCollection): Promise<void> {
    let client = getSupabaseClient();
    if (!client || !accessToken) {
      const { AuthService } = await import('./authService');
      const token = await AuthService.getAccessToken();
      if (!token) throw new Error('Sesi login tidak ditemukan. Silakan masuk kembali untuk memuat data.');
      client = refreshSupabaseClient(token);
    }
    if (!client) throw new Error('Supabase belum terhubung. Data cloud belum dapat dimuat.');
    const records = await loadSharedRecords(client, collection);

    const values: unknown[] = [];
    const deletedIds = new Set<string>();
    for (const row of records) {
      if (row.payload?._deleted === true) {
        deletedIds.add(row.record_id);
        baseline.set(makeKey(collection, row.record_id), JSON.stringify(row.payload));
        baselineOwners.set(makeKey(collection, row.record_id), row.owner_id || null);
        baselineOrganizations.set(makeKey(collection, row.record_id), row.organization_id || null);
        continue;
      }
      const payload = collection === 'locations' &&
        row.payload.approvalStatus === 'pending' &&
        row.owner_id
        ? { ...row.payload, submittedBy: row.owner_id }
        : row.payload;
      values.push(payload);
      baseline.set(makeKey(collection, row.record_id), snapshotValue(collection, payload));
      baselineOwners.set(makeKey(collection, row.record_id), row.owner_id || null);
      baselineOrganizations.set(makeKey(collection, row.record_id), row.organization_id || null);
    }

    const localRecords = storedRecords(collection);
    if (collection === 'threads') {
      const activeUserId = activeUser?.id;
      const visibleIds = new Set(values.map(rowId).filter((id): id is string => Boolean(id)));
      const ownLocalThreads = localRecords.filter((value) =>
        isRecord(value) &&
        typeof activeUserId === 'string' &&
        value.userId === activeUserId &&
        !visibleIds.has(String(value.id)) &&
        !deletedIds.has(String(value.id)) &&
        !StorageService.isThreadDeletedLocally(activeUserId, String(value.id)),
      );
      values.push(...ownLocalThreads);
    }
    isApplyingRemoteChange = true;
    try {
      saveCollection(collection, values);
      window.dispatchEvent(new CustomEvent('mh-data-updated', { detail: { collection, values } }));
    } finally {
      isApplyingRemoteChange = false;
    }
    if (collection === 'threads') await pushChanges(collection, values);
  }

  /**
   * Operasi DELETE record langsung di tabel mh_records di Supabase
   * Menggunakan soft delete payload _deleted: true agar tertangkap event WebSocket realtime
   * dan menghapus row dari Supabase.
   */
  static async deleteRecord(collection: SharedCollection, recordId: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase belum terhubung. Perubahan belum tersimpan ke database.');

    // 1. Soft-delete payload agar client lain menerima realtime update seketika
    const key = makeKey(collection, recordId);
    const ownerId = collection === 'threads'
      ? baselineOwners.get(key) || activeUser?.id || null
      : activeUser?.id || null;
    const organizationId = baselineOrganizations.get(key) || recordOrganization(collection);
    const tombstone = {
      id: recordId,
      ...(collection === 'threads' && ownerId ? { userId: ownerId } : {}),
      _deleted: true,
    };
    const softDeleteRow: SharedRecord = {
      collection,
      record_id: recordId,
      owner_id: ownerId,
      organization_id: organizationId,
      payload: tombstone,
      updated_at: new Date().toISOString(),
    };

    const { error } = await client
      .from('mh_records')
      .upsert(softDeleteRow, { onConflict: 'collection,record_id' });
    if (error) {
      emitStatus('error', `Gagal menghapus data (${collection}): ${error.message}`);
      throw new Error(`Gagal menghapus data (${collection}): ${error.message}`);
    }

    baseline.set(key, JSON.stringify(tombstone));
    baselineOwners.set(key, ownerId);
    baselineOrganizations.set(key, organizationId);
    emitStatus('synced');
  }

  /**
   * CRUD: Upsert Organisasi ke tabel mh_organizations dan mh_records ('communities')
   */
  static async upsertOrganization(community: Community, ownerId?: string | null): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;

    const validOwnerId = ownerId || activeUser?.id;
    // Tulis ke mh_organizations jika owner_id tersedia
    if (validOwnerId) {
      const { error: orgError } = await client.from('mh_organizations').upsert(
        {
          id: community.id,
          name: community.name,
          category: community.category,
          location: community.location || 'Tapanuli Utara',
          owner_id: validOwnerId,
        },
        { onConflict: 'id' },
      );
      if (orgError) {
        emitStatus('error', `Komunitas gagal disimpan: ${orgError.message}`);
        throw new Error(`Komunitas gagal disimpan: ${orgError.message}`);
      }
    }

    // Selalu simpan snapshot lengkap komunitas ke mh_records ('communities')
    await this.upsertRecord(
      'communities',
      community.id,
      community as unknown as Record<string, unknown>,
      validOwnerId || null,
      community.id,
    );
  }

  /**
   * CRUD: Hapus Organisasi dari tabel mh_organizations dan mh_records
   */
  static async deleteOrganization(organizationId: string): Promise<void> {
    const client = getSupabaseClient();
    if (client) {
      const { error } = await client
        .from('mh_organizations')
        .delete()
        .match({ id: organizationId });
      if (error) {
        emitStatus('error', `Komunitas gagal dihapus: ${error.message}`);
        throw new Error(`Komunitas gagal dihapus: ${error.message}`);
      }
    }
    await this.deleteRecord('communities', organizationId);
  }

  /**
   * CRUD: Tantangan (Challenges)
   */
  static async upsertChallenge(challenge: Challenge): Promise<void> {
    await this.upsertRecord('challenges', challenge.id, challenge as unknown as Record<string, unknown>);
  }

  static async deleteChallenge(challengeId: string): Promise<void> {
    await this.deleteRecord('challenges', challengeId);
  }

  /**
   * CRUD: Kegiatan Hijau (Events)
   */
  static async upsertEvent(event: GreenEvent): Promise<void> {
    await this.upsertRecord('events', event.id, event as unknown as Record<string, unknown>);
  }

  static async deleteEvent(eventId: string): Promise<void> {
    await this.deleteRecord('events', eventId);
  }

  /**
   * CRUD: Renungan Harian (Devotions)
   */
  static async upsertDevotion(devotion: Devotion): Promise<void> {
    await this.upsertRecord('devotions', devotion.id, devotion as unknown as Record<string, unknown>);
  }

  static async deleteDevotion(devotionId: string): Promise<void> {
    await this.deleteRecord('devotions', devotionId);
  }

  /**
   * CRUD: Laporan Lingkungan (Reports)
   */
  static async upsertReport(report: EnvironmentalReport): Promise<void> {
    await this.upsertRecord('reports', report.id, report as unknown as Record<string, unknown>);
  }

  static async deleteReport(reportId: string): Promise<void> {
    await this.deleteRecord('reports', reportId);
  }

  /**
   * CRUD: Titik Peta (Locations)
   */
  static async upsertLocation(location: MapMarkerLocation): Promise<void> {
    await this.upsertRecord('locations', location.id, location as unknown as Record<string, unknown>);
  }

  static async deleteLocation(locationId: string): Promise<void> {
    await this.deleteRecord('locations', locationId);
  }

  /**
   * Muat titik peta dari database Supabase
   */
  static async refreshMapLocations(): Promise<MapMarkerLocation[]> {
    const client = getSupabaseClient();
    if (!client) return StorageService.getMapLocations();

    const { data, error } = await client
      .from('mh_records')
      .select('payload,owner_id')
      .eq('collection', 'locations');

    if (error) {
      console.warn('[SharedDataService] Titik peta gagal dimuat:', error.message);
      return StorageService.getMapLocations();
    }

    const locations = (data || [])
      .filter((record) => record.payload?._deleted !== true && isMapLocation(record.payload))
      .map((record) => {
        const location = record.payload as unknown as MapMarkerLocation;
        if (location.approvalStatus === 'pending' && record.owner_id) {
          return { ...location, submittedBy: record.owner_id };
        }
        return location;
      });

    if (activeUser) {
      const localPending = StorageService.getMapLocations().filter(
        (location) => location.approvalStatus === 'pending' && location.submittedBy === activeUser?.id,
      );
      const byId = new Map(locations.map((location) => [location.id, location]));
      for (const location of localPending) {
        if (!byId.has(location.id)) byId.set(location.id, location);
      }
      locations.splice(0, locations.length, ...byId.values());
    }

    StorageService.applySharedSnapshot('locations', locations);
    return locations;
  }

  /**
   * Inisialisasi koneksi sinkronisasi & aktifkan subscription real-time WebSocket
   */
  static async connect(user: User, token: string | null): Promise<void> {
    this.disconnect();
    activeUser = latestUser?.id === user.id ? latestUser : user;
    accessToken = token;

    const client = refreshSupabaseClient(token);
    if (!client) {
      emitStatus('offline', 'Database Supabase belum dikonfigurasi. Menggunakan penyimpanan lokal.');
      return;
    }

    emitStatus('connecting');
    try {
      const [remoteRecords, organizations] = await Promise.all([
        loadSharedRecords(client),
        loadOrganizations(),
      ]);

      const grouped = new Map<SharedCollection, Map<string, unknown>>();
      const deleted = new Map<SharedCollection, Set<string>>();
      for (const col of recordCollections) grouped.set(col, new Map());
      for (const col of recordCollections) deleted.set(col, new Set());

      for (const record of remoteRecords) {
        if (!grouped.has(record.collection)) continue;
        if (record.payload?._deleted === true) {
          deleted.get(record.collection)!.add(record.record_id);
          baseline.set(makeKey(record.collection, record.record_id), JSON.stringify(record.payload));
          baselineOwners.set(makeKey(record.collection, record.record_id), record.owner_id || null);
          baselineOrganizations.set(makeKey(record.collection, record.record_id), record.organization_id || null);
          continue;
        }
        const payload =
          record.collection === 'locations' &&
          record.payload.approvalStatus === 'pending' &&
          record.owner_id
            ? { ...record.payload, submittedBy: record.owner_id }
            : record.payload;
        grouped.get(record.collection)!.set(record.record_id, payload);
        baseline.set(makeKey(record.collection, record.record_id), JSON.stringify(payload));
        baselineOwners.set(makeKey(record.collection, record.record_id), record.owner_id || null);
        baselineOrganizations.set(makeKey(record.collection, record.record_id), record.organization_id || null);
      }

      for (const col of recordCollections) {
        const merged = new Map<string, unknown>();
        for (const value of storedRecords(col)) {
          const id = rowId(value);
          if (id && !deleted.get(col)!.has(id)) merged.set(id, value);
        }
        for (const [id, value] of grouped.get(col)!) merged.set(id, value);
        saveCollection(col, [...merged.values()]);
      }
      mergeOrganizations(organizations);

      for (const col of recordCollections) {
        for (const value of storedRecords(col)) {
          const id = rowId(value);
          if (id && !baseline.has(makeKey(col, id))) {
            baseline.set(makeKey(col, id), snapshotValue(col, value));
            const ownerId = col === 'threads' && isRecord(value) && typeof value.userId === 'string'
              ? value.userId
              : activeUser?.id || null;
            baselineOwners.set(makeKey(col, id), ownerId);
            baselineOrganizations.set(makeKey(col, id), recordOrganization(col));
          }
        }
      }

      const collectionsToMigrate = new Set<SharedCollection>();
      for (const col of recordCollections) {
        const remoteIds = grouped.get(col)!;
        const deletedIds = deleted.get(col)!;
        for (const value of storedRecords(col)) {
          const id = rowId(value);
          if (!id || remoteIds.has(id) || deletedIds.has(id)) continue;
          const isOwnedRecord =
            col === 'threads' && isRecord(value) && value.userId === user.id ||
            col === 'reports' && isRecord(value) && value.userId === user.id ||
            col === 'locations' && isRecord(value) && value.submittedBy === user.id;
          if (user.role === 'admin' || isOwnedRecord) {
            baseline.delete(makeKey(col, id));
            collectionsToMigrate.add(col);
          }
        }
      }

      // Aktifkan Real-Time WebSocket Channel
      realtimeChannel = client
        .channel('public:mh_realtime_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'mh_records' },
          (payload) => {
            handleRemoteRecordChange(payload);
          },
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'mh_organizations' },
          (payload) => {
            handleRemoteOrgChange(payload);
          },
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'mh_submissions' },
          (payload) => {
            handleRemoteSubmissionChange(payload);
          },
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[SharedDataService] Realtime channel tersambung.');
            emitStatus('synced');
          }
        });

      window.addEventListener('mh-shared-data-change', handleLocalChange);
      for (const collection of collectionsToMigrate) {
        await pushChanges(collection, storedRecords(collection));
      }
      if (user.role === 'admin') {
        await this.publishMissingChallenges(client);
      }
      emitStatus('synced');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal memuat data bersama Supabase.';
      emitStatus('error', message);
      console.error(message);
    }
  }

  private static async publishMissingChallenges(client: SupabaseClient): Promise<void> {
    const { data, error } = await client
      .from('mh_records')
      .select('record_id,payload')
      .eq('collection', 'challenges');
    if (error) throw new Error(`Tantangan yang belum tersinkron gagal diperiksa: ${error.message}`);

    const remoteRecords = new Map(
      (data || []).map((row) => [row.record_id as string, row.payload as Record<string, unknown>]),
    );
    const localChallenges = StorageService.getChallenges();
    for (const challenge of localChallenges) {
      const remote = remoteRecords.get(challenge.id);
      if (remote) continue;

      await this.upsertChallenge(challenge);
      console.info(`[SharedDataService] Tantangan ${challenge.id} dipublikasikan ke Supabase.`);
    }
  }

  static disconnect() {
    window.removeEventListener('mh-shared-data-change', handleLocalChange);
    if (realtimeChannel) {
      void realtimeChannel.unsubscribe();
      realtimeChannel = null;
    }
    activeUser = null;
    accessToken = null;
    baseline = new Map();
    baselineOwners = new Map();
    baselineOrganizations = new Map();
    queue = Promise.resolve();
  }
}
