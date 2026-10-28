import { AuthService } from './authService';
import { compressImage } from './imageCompression';

interface PublicProfilePhoto {
  user_id: string;
  avatar_path: string;
  updated_at?: string;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/+$/, '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const bucketName = 'profile-photos';
const maximumSourceBytes = 10 * 1024 * 1024;
const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

function assertConfigured(): void {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Foto profil belum dikonfigurasi. Admin perlu mengatur koneksi Supabase.');
  }
}

function getPublicObjectUrl(path: string): string {
  if (!supabaseUrl) throw new Error('Koneksi Supabase belum dikonfigurasi.');
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${encodedPath}`;
}

function getOwnedObjectPath(path: string | undefined, userId: string): string | null {
  return path?.startsWith(`${userId}/`) ? path : null;
}

async function getAccessToken(): Promise<string> {
  const token = await AuthService.getAccessToken();
  if (!token) throw new Error('Sesi masuk tidak ditemukan. Silakan masuk kembali.');
  return token;
}

async function requestPublicProfiles(path: string, token?: string, init: RequestInit = {}): Promise<Response> {
  assertConfigured();
  return fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: supabaseAnonKey!,
      Authorization: `Bearer ${token || supabaseAnonKey}`,
      ...(init.headers || {}),
    },
  });
}

async function requestStorageObject(
  path: string,
  token: string,
  method: 'POST' | 'DELETE',
  body?: Blob,
): Promise<void> {
  assertConfigured();
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const response = await fetch(`${supabaseUrl}/storage/v1/object/${bucketName}/${encodedPath}`, {
    method,
    headers: {
      apikey: supabaseAnonKey!,
      Authorization: `Bearer ${token}`,
      ...(body
        ? {
            'Content-Type': 'image/jpeg',
            'Cache-Control': '3600',
            'x-upsert': 'false',
          }
        : {}),
    },
    body,
  });
  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || `Foto profil gagal ${method === 'POST' ? 'diunggah' : 'dihapus'} (HTTP ${response.status}).`);
  }
}

export async function fetchProfilePhotoUrls(userIds: string[]): Promise<Record<string, string>> {
  const uniqueIds = [...new Set(userIds)].filter((id) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id),
  );
  if (uniqueIds.length === 0) return {};
  assertConfigured();

  const query = new URLSearchParams({
    select: 'user_id,avatar_path',
    user_id: `in.(${uniqueIds.join(',')})`,
  });
  const response = await requestPublicProfiles(`mh_public_profiles?${query}`);
  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || `Foto profil gagal dimuat (HTTP ${response.status}).`);
  }

  const profiles = await response.json() as PublicProfilePhoto[];
  return Object.fromEntries(
    profiles.map((profile) => [profile.user_id, getPublicObjectUrl(profile.avatar_path)]),
  );
}

export async function fetchRecentPublicProfilePhotos(): Promise<Array<{ userId: string; url: string }>> {
  const query = new URLSearchParams({
    select: 'user_id,avatar_path,updated_at',
    order: 'updated_at.desc',
    limit: '100',
  });
  const response = await requestPublicProfiles(`mh_public_profiles?${query}`);
  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || `Galeri foto profil gagal dimuat (HTTP ${response.status}).`);
  }

  const profiles = await response.json() as PublicProfilePhoto[];
  return profiles.map((profile) => ({
    userId: profile.user_id,
    url: getPublicObjectUrl(profile.avatar_path),
  }));
}

export async function uploadProfilePhoto(file: File, userId: string): Promise<string> {
  assertConfigured();
  if (!allowedImageTypes.has(file.type)) {
    throw new Error('Gunakan foto berformat JPG, PNG, atau WebP.');
  }
  if (file.size > maximumSourceBytes) {
    throw new Error('Ukuran foto maksimal 10 MB sebelum dikompres.');
  }

  const token = await getAccessToken();
  const previousPath = await getOwnProfilePhotoPath(userId, token);
  const { dataUrl } = await compressImage(file, 512, 512, 0.82);
  const image = await (await fetch(dataUrl)).blob();
  if (image.size > 2 * 1024 * 1024) {
    throw new Error('Foto masih terlalu besar setelah dikompres. Coba pilih foto lain.');
  }

  const objectPath = `${userId}/${crypto.randomUUID()}.jpg`;
  await requestStorageObject(objectPath, token, 'POST', image);

  try {
    const response = await requestPublicProfiles('mh_public_profiles?on_conflict=user_id', token, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify([{
        user_id: userId,
        avatar_path: objectPath,
        updated_at: new Date().toISOString(),
      }]),
    });
    if (!response.ok) {
      const details = await response.text();
      throw new Error(details || `Foto profil gagal disimpan (HTTP ${response.status}).`);
    }
  } catch (error) {
    try {
      await requestStorageObject(objectPath, token, 'DELETE');
    } catch (cleanupError) {
      console.error('Gagal membersihkan foto profil yang tidak tersimpan.', cleanupError);
    }
    throw error;
  }

  if (previousPath) {
    try {
      await requestStorageObject(previousPath, token, 'DELETE');
    } catch (error) {
      console.warn('Foto profil lama belum berhasil dibersihkan dari Storage.', error);
    }
  }

  return getPublicObjectUrl(objectPath);
}

async function getOwnProfilePhotoPath(userId: string, token: string): Promise<string | null> {
  const query = new URLSearchParams({
    select: 'user_id,avatar_path',
    user_id: `eq.${userId}`,
    limit: '1',
  });
  const response = await requestPublicProfiles(`mh_public_profiles?${query}`, token);
  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || `Foto profil lama gagal dimuat (HTTP ${response.status}).`);
  }

  const profiles = await response.json() as PublicProfilePhoto[];
  return getOwnedObjectPath(profiles[0]?.avatar_path, userId);
}

export async function removeProfilePhoto(userId: string): Promise<void> {
  const token = await getAccessToken();
  const previousPath = await getOwnProfilePhotoPath(userId, token);
  if (!previousPath) return;

  await requestStorageObject(previousPath, token, 'DELETE');
  const query = new URLSearchParams({ user_id: `eq.${userId}` });
  const response = await requestPublicProfiles(`mh_public_profiles?${query}`, token, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || `Data foto profil gagal dihapus (HTTP ${response.status}).`);
  }
}
