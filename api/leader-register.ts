import { randomUUID, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';

interface LeaderRegistrationBody {
  invitationCode: string;
  email: string;
  password: string;
  metadata: {
    name?: string;
    organizationName?: string;
    organizationCategory?: string;
    organizationLocation?: string;
  };
}

function isValidInvitation(code: string): boolean {
  const expected = process.env.LEADER_SIGNUP_TOKEN;
  if (!expected || !code || Buffer.byteLength(code) !== Buffer.byteLength(expected)) return false;
  return timingSafeEqual(Buffer.from(code), Buffer.from(expected));
}

export default async function leaderRegisterHandler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body as LeaderRegistrationBody;
  if (
    !body ||
    typeof body.invitationCode !== 'string' ||
    typeof body.email !== 'string' ||
    typeof body.password !== 'string' ||
    !body.metadata ||
    typeof body.metadata.name !== 'string' ||
    typeof body.metadata.organizationName !== 'string'
  ) {
    return res.status(400).json({ error: 'Data pendaftaran pemimpin belum lengkap.' });
  }

  if (!isValidInvitation(body.invitationCode)) {
    return res.status(403).json({ error: 'Tautan pendaftaran pemimpin tidak valid atau sudah tidak berlaku.' });
  }

  const email = body.email.trim().toLowerCase();
  const name = body.metadata.name.trim();
  const organizationName = body.metadata.organizationName.trim();
  const allowedCategories = ['Kampus', 'Gereja', 'Pemuda', 'Komunitas Warga'];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Alamat email tidak valid.' });
  }
  if (
    body.password.length < 8 ||
    name.length < 2 ||
    organizationName.length < 2 ||
    (body.metadata.organizationCategory && !allowedCategories.includes(body.metadata.organizationCategory))
  ) {
    return res.status(400).json({ error: 'Nama, organisasi, atau kata sandi belum memenuhi ketentuan.' });
  }

  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error('Leader registration requires Supabase URL, anon key, and service role key.');
    return res.status(503).json({ error: 'Pendaftaran pemimpin belum dikonfigurasi. Hubungi pengelola aplikasi.' });
  }

  const organizationId = `org-${randomUUID()}`;
  const redirectUrl = process.env.LEADER_AUTH_REDIRECT_URL;
  const signupUrl = new URL(`${supabaseUrl}/auth/v1/signup`);
  if (redirectUrl) signupUrl.searchParams.set('redirect_to', redirectUrl);
  try {
    const signupResponse = await fetch(signupUrl, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password: body.password,
        data: {
          name,
          communityId: organizationId,
          communityName: organizationName,
          organizationName,
          organizationCategory: body.metadata.organizationCategory || 'Komunitas Warga',
          organizationLocation: body.metadata.organizationLocation?.trim() || 'Tapanuli Utara',
          joinedDate: new Date().toISOString().split('T')[0],
        },
      }),
    });
    const signupPayload = await signupResponse.json().catch(() => null) as
      | {
          id?: string;
          email?: string;
          identities?: Array<{ provider?: string }>;
          user?: { id?: string; email?: string; identities?: Array<{ provider?: string }> };
          msg?: string;
          message?: string;
        }
      | null;
    const createdUser = signupPayload?.user || signupPayload;
    const userId = createdUser?.id;
    const hasEmailIdentity = createdUser?.identities?.some((identity) => identity.provider === 'email') ?? false;
    if (!signupResponse.ok || !userId) {
      return res.status(signupResponse.status || 502).json({
        error: signupPayload?.msg || signupPayload?.message || 'Pendaftaran akun gagal. Periksa email atau coba kembali.',
      });
    }
    if (createdUser?.email?.toLowerCase() !== email || !hasEmailIdentity) {
      return res.status(409).json({ error: 'Email ini sudah digunakan atau tidak dapat didaftarkan sebagai akun baru.' });
    }

    const roleResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_metadata: {
          role: 'pemimpin',
          organization_id: organizationId,
        },
      }),
    });

    if (!roleResponse.ok) {
      const rolePayload = await roleResponse.json().catch(() => null) as { msg?: string; message?: string } | null;
      console.error('Failed to assign leader role to the new account:', rolePayload?.msg || rolePayload?.message || roleResponse.status);
      const deleteResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      });
      if (!deleteResponse.ok) {
        console.error('Failed to clean up leader account without assigned role:', deleteResponse.status);
      }
      return res.status(502).json({
        error: 'Pendaftaran pemimpin gagal diselesaikan. Silakan coba kembali atau hubungi pengelola.',
      });
    }

    const organizationResponse = await fetch(`${supabaseUrl}/rest/v1/mh_organizations`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        id: organizationId,
        name: organizationName,
        category: body.metadata.organizationCategory || 'Komunitas Warga',
        location: body.metadata.organizationLocation?.trim() || 'Tapanuli Utara',
        owner_id: userId,
      }),
    });

    if (!organizationResponse.ok) {
      const organizationError = await organizationResponse.text();
      console.error('Failed to create organization for new leader:', organizationError);
      const deleteResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      });
      if (!deleteResponse.ok) {
        console.error('Failed to clean up leader account without an organization:', deleteResponse.status);
      }
      return res.status(502).json({
        error: 'Organisasi belum dapat disimpan ke database. Silakan coba kembali atau hubungi pengelola.',
      });
    }

    return res.status(201).json({ message: 'Akun pemimpin berhasil dibuat. Periksa email untuk konfirmasi.' });
  } catch (error) {
    console.error('Leader registration request failed:', error);
    return res.status(502).json({ error: 'Layanan pendaftaran sedang tidak tersedia. Coba kembali nanti.' });
  }
}
