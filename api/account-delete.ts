import type { Request, Response } from 'express';

interface StorageEntry {
  name: string;
  id: string | null;
  metadata?: { ownerId?: string };
}

function getSupabaseConfig() {
  return {
    url: (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, ''),
    anonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  };
}

async function listStorageFolder(
  url: string,
  serviceRoleKey: string,
  bucket: string,
  prefix: string,
): Promise<StorageEntry[]> {
  const entries: StorageEntry[] = [];
  const pageSize = 1000;

  for (let offset = 0; ; offset += pageSize) {
    const response = await fetch(`${url}/storage/v1/object/list/${encodeURIComponent(bucket)}`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: 'Bearer '.concat(serviceRoleKey),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prefix,
        limit: pageSize,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      }),
    });
    if (!response.ok) throw new Error(`Storage ${bucket} gagal diperiksa (HTTP ${response.status}).`);

    const page = await response.json() as StorageEntry[];
    entries.push(...page);
    if (page.length < pageSize) break;
  }

  return entries;
}

async function collectNestedFiles(
  url: string,
  serviceRoleKey: string,
  bucket: string,
  prefix: string,
): Promise<string[]> {
  const entries = await listStorageFolder(url, serviceRoleKey, bucket, prefix);
  const files: string[] = [];

  for (const entry of entries) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.id === null) {
      files.push(...await collectNestedFiles(url, serviceRoleKey, bucket, path));
    } else {
      files.push(path);
    }
  }

  return files;
}

async function deleteStorageObjects(
  url: string,
  serviceRoleKey: string,
  bucket: string,
  paths: string[],
): Promise<void> {
  for (let index = 0; index < paths.length; index += 100) {
    const response = await fetch(`${url}/storage/v1/object/${encodeURIComponent(bucket)}`, {
      method: 'DELETE',
      headers: {
        apikey: serviceRoleKey,
        Authorization: 'Bearer '.concat(serviceRoleKey),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prefixes: paths.slice(index, index + 100) }),
    });
    if (!response.ok) throw new Error(`Foto akun gagal dihapus dari ${bucket} (HTTP ${response.status}).`);
  }
}

async function collectUserObjects(
  url: string,
  serviceRoleKey: string,
  bucket: string,
  userId: string,
): Promise<string[]> {
  return collectNestedFiles(url, serviceRoleKey, bucket, userId);
}

export default async function accountDeleteHandler(req: Request, res: Response) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authorization = req.headers.authorization;
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) return res.status(401).json({ error: 'Sesi akun tidak ditemukan. Silakan masuk kembali.' });

  const { url, anonKey, serviceRoleKey } = getSupabaseConfig();
  if (!url || !anonKey || !serviceRoleKey) {
    return res.status(503).json({ error: 'Penghapusan akun belum dikonfigurasi oleh pengelola aplikasi.' });
  }

  try {
    const userResponse = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: 'Bearer '.concat(accessToken) },
    });
    if (!userResponse.ok) {
      return res.status(401).json({ error: 'Sesi akun tidak valid. Silakan masuk kembali.' });
    }

    const authUser = await userResponse.json() as {
      id?: string;
      app_metadata?: { role?: string };
    };
    if (!authUser.id) return res.status(401).json({ error: 'Akun aktif tidak dapat diverifikasi.' });
    if (authUser.app_metadata?.role === 'admin' || authUser.app_metadata?.role === 'pemimpin') {
      return res.status(403).json({
        error: 'Akun pengelola atau pemimpin komunitas tidak dapat dihapus dari halaman ini. Hubungi administrator untuk pengalihan tanggung jawab.',
      });
    }

    const organizationsUrl = new URL(`${url}/rest/v1/mh_organizations`);
    organizationsUrl.search = new URLSearchParams({
      select: 'id',
      owner_id: `eq.${authUser.id}`,
      limit: '1',
    }).toString();
    const organizationResponse = await fetch(organizationsUrl, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: 'Bearer '.concat(serviceRoleKey),
      },
    });
    if (!organizationResponse.ok) {
      throw new Error('Kepemilikan komunitas akun gagal diperiksa.');
    }
    const ownedOrganizations = await organizationResponse.json() as Array<{ id: string }>;
    if (ownedOrganizations.length > 0) {
      return res.status(409).json({
        error: 'Akun ini masih memiliki komunitas. Hubungi administrator untuk mengalihkan kepemilikan sebelum menghapus akun.',
      });
    }

    for (const bucket of ['profile-photos', 'mh-user-media', 'mh-challenge-proofs']) {
      const objects = await collectUserObjects(url, serviceRoleKey, bucket, authUser.id);
      await deleteStorageObjects(url, serviceRoleKey, bucket, objects);
    }

    const galleryFiles = await collectNestedFiles(url, serviceRoleKey, 'community-gallery', '');
    const ownedGalleryFiles = galleryFiles.filter((path) => {
      const filename = path.split('/').pop() || '';
      return filename.startsWith(`${authUser.id}--`);
    });
    await deleteStorageObjects(url, serviceRoleKey, 'community-gallery', ownedGalleryFiles);

    const deleteAuthResponse = await fetch(
      `${url}/auth/v1/admin/users/${encodeURIComponent(authUser.id)}`,
      {
        method: 'DELETE',
        headers: {
          apikey: serviceRoleKey,
          Authorization: 'Bearer '.concat(serviceRoleKey),
        },
      },
    );
    if (!deleteAuthResponse.ok) {
      throw new Error('Akun gagal dihapus. Data akun belum dihapus; silakan coba kembali.');
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[AccountDelete] Penghapusan akun gagal:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Penghapusan akun gagal. Silakan coba kembali.',
    });
  }
}
