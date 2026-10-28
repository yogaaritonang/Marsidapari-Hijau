import { MapMarkerLocation, User } from '../types';
import { StorageService } from './storageService';

type SharedCollection = 'brand' | 'challenges' | 'communities' | 'devotions' | 'events' | 'locations' | 'reports' | 'threads';
type SyncState = 'connecting' | 'synced' | 'error' | 'offline';

interface SharedRecord {
  collection: SharedCollection;
  record_id: string;
  owner_id?: string | null;
  organization_id: string | null;
  payload: Record<string, unknown>;
}

interface OrganizationRecord {
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
];

let activeUser: User | null = null;
let accessToken: string | null = null;
let baseline = new Map<string, string>();
let queue = Promise.resolve();

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
      return [];
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
  if (activeUser.role === 'admin') return true;
  if (activeUser.role === 'pemimpin') {
    return ['events', 'locations', 'reports'].includes(collection);
  }
  return collection === 'locations' || collection === 'reports';
}

function recordOrganization(collection: SharedCollection): string | null {
  if (collection === 'events' || collection === 'reports') return activeUser?.communityId || null;
  if (collection === 'communities' && activeUser?.role === 'pemimpin') return activeUser.communityId;
  return null;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!supabaseUrl || !supabaseAnonKey || !accessToken) {
    throw new Error('Koneksi database bersama belum siap. Masuk kembali setelah konfigurasi Supabase selesai.');
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Sinkronisasi database gagal (HTTP ${response.status}): ${body || response.statusText}`);
  }
  const body = await response.text();
  return body ? JSON.parse(body) as T : undefined as T;
}

async function loadOrganizations(): Promise<OrganizationRecord[]> {
  return request<OrganizationRecord[]>('mh_organizations?select=id,name,category,location,owner_id&order=name.asc');
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
  StorageService.applySharedSnapshot('communities', [...byId.values()]);
}

async function pushChanges(collection: SharedCollection, values: unknown[]) {
  if (!canWrite(collection)) return;
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
    if (
      collection === 'locations' &&
      activeUser?.role === 'anggota' &&
      (baseline.has(key) ||
        !isRecord(value) ||
        value.category !== 'bank_sampah' ||
        value.approvalStatus !== 'pending' ||
        value.submittedBy !== activeUser.id)
    ) continue;

    changes.push({
      collection,
      record_id: id,
      owner_id: collection === 'reports' && activeUser?.role === 'anggota'
        ? activeUser.id
        : collection === 'locations' && isRecord(value) && typeof value.submittedBy === 'string'
        ? value.submittedBy
        : null,
      organization_id: recordOrganization(collection),
      payload: recordPayload(collection, value),
    });
  }

  for (const [key] of (activeUser?.role === 'admin' ? baseline : [])) {
    if (!key.startsWith(`${collection}:`)) continue;
    const id = key.slice(collection.length + 1);
    if (!current.has(id) && baseline.get(key) !== JSON.stringify({ id, _deleted: true })) {
      changes.push({
        collection,
        record_id: id,
        owner_id: null,
        organization_id: recordOrganization(collection),
        payload: { id, _deleted: true },
      });
    }
  }

  if (changes.length === 0) return;
  await request('mh_records?on_conflict=collection,record_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(changes),
  });
  for (const change of changes) {
    const key = makeKey(collection, change.record_id);
    baseline.set(
      key,
      snapshotValue(collection, current.get(change.record_id) ?? change.payload),
    );
  }
}

async function handleLocalChange(event: Event) {
  const detail = (event as CustomEvent<{ collection: SharedCollection; values: unknown[] }>).detail;
  if (!detail || !recordCollections.includes(detail.collection)) return;
  queue = queue.then(async () => {
    try {
      await pushChanges(detail.collection, detail.values);
      emitStatus('synced');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sinkronisasi database gagal.';
      emitStatus('error', message);
      console.error(message);
    }
  });
  await queue;
}

export class SharedDataService {
  static isConfigured(): boolean {
    return Boolean(supabaseUrl && supabaseAnonKey);
  }

  static async refreshMapLocations(): Promise<MapMarkerLocation[]> {
    if (!supabaseUrl || !supabaseAnonKey) return StorageService.getMapLocations();

    const query = new URLSearchParams({
      select: accessToken ? 'payload,owner_id' : 'payload',
      collection: 'eq.locations',
    });
    const response = accessToken
      ? await request<SharedRecord[]>(`mh_records?${query}`)
      : await fetch(`${supabaseUrl}/rest/v1/mh_records?${query}`, {
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
        }).then(async (result) => {
          if (!result.ok) {
            const body = await result.text();
            throw new Error(`Titik peta gagal dimuat (HTTP ${result.status}): ${body || result.statusText}`);
          }
          return await result.json() as SharedRecord[];
        });

    const locations = response
      .filter((record) => record.payload?._deleted !== true && isMapLocation(record.payload))
      .map((record) => {
        const location = record.payload as unknown as MapMarkerLocation;
        if (location.approvalStatus === 'pending' && record.owner_id) {
          return { ...location, submittedBy: record.owner_id };
        }
        return location;
      });
    if (activeUser) {
      const localPending = StorageService.getMapLocations().filter((location) =>
        location.approvalStatus === 'pending' && location.submittedBy === activeUser?.id,
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

  static async connect(user: User, token: string | null): Promise<void> {
    this.disconnect();
    activeUser = user;
    accessToken = token;
    if (!this.isConfigured() || !token) {
      emitStatus('offline', 'Database bersama belum terhubung. Perubahan tersimpan di perangkat ini.');
      return;
    }

    emitStatus('connecting');
    try {
      const [remoteRecords, organizations] = await Promise.all([
        request<SharedRecord[]>('mh_records?select=collection,record_id,owner_id,organization_id,payload'),
        loadOrganizations(),
      ]);
      const grouped = new Map<SharedCollection, Map<string, unknown>>();
      const deleted = new Map<SharedCollection, Set<string>>();
      for (const collection of recordCollections) grouped.set(collection, new Map());
      for (const collection of recordCollections) deleted.set(collection, new Set());
      for (const record of remoteRecords) {
        if (!grouped.has(record.collection)) continue;
        if (record.payload?._deleted === true) {
          deleted.get(record.collection)!.add(record.record_id);
          baseline.set(makeKey(record.collection, record.record_id), JSON.stringify(record.payload));
          continue;
        }
        const payload = record.collection === 'locations' &&
          record.payload.approvalStatus === 'pending' &&
          record.owner_id
          ? { ...record.payload, submittedBy: record.owner_id }
          : record.payload;
        grouped.get(record.collection)!.set(record.record_id, payload);
        baseline.set(makeKey(record.collection, record.record_id), JSON.stringify(payload));
      }

      for (const collection of recordCollections) {
        const merged = new Map<string, unknown>();
        for (const value of storedRecords(collection)) {
          const id = rowId(value);
          if (id && !deleted.get(collection)!.has(id)) merged.set(id, value);
        }
        for (const [id, value] of grouped.get(collection)!) merged.set(id, value);
        saveCollection(collection, [...merged.values()]);
      }
      mergeOrganizations(organizations);

      for (const collection of recordCollections) {
        for (const value of storedRecords(collection)) {
          const id = rowId(value);
          if (id && !baseline.has(makeKey(collection, id))) {
            baseline.set(makeKey(collection, id), snapshotValue(collection, value));
          }
        }
      }
      window.addEventListener('mh-shared-data-change', handleLocalChange);
      emitStatus('synced');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal memuat data bersama Supabase.';
      emitStatus('error', message);
      console.error(message);
    }
  }

  static disconnect() {
    window.removeEventListener('mh-shared-data-change', handleLocalChange);
    activeUser = null;
    accessToken = null;
    baseline = new Map();
    queue = Promise.resolve();
  }
}
