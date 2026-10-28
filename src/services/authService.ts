import { User } from '../types';
import { StorageService } from './storageService';

export interface AuthUser {
  id: string;
  email?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}

interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

interface AuthResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user?: AuthUser;
}

const SESSION_KEY = 'mh_auth_session';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/+$/, '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export class AuthService {
  static isConfigured(): boolean {
    return Boolean(supabaseUrl && supabaseAnonKey);
  }

  static async signUp(
    email: string,
    password: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    const redirectTo = encodeURIComponent(window.location.origin);
    await this.request<AuthResponse>(
      `/signup?redirect_to=${redirectTo}`,
      {
        email,
        password,
        data: metadata,
      },
    );
  }

  static async registerLeader(
    invitationCode: string,
    email: string,
    password: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    const response = await fetch('/api/leader-register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invitationCode, email, password, metadata }),
    });
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    if (!response.ok) {
      throw new Error(payload?.error || 'Pendaftaran pemimpin gagal. Silakan coba kembali.');
    }
  }

  static async sendLoginCode(email: string): Promise<void> {
    await this.request('/otp', { email, create_user: false });
  }

  static async verifyLoginCode(email: string, code: string): Promise<AuthUser> {
    const response = await this.request<AuthResponse>('/verify', {
      email,
      token: code,
      type: 'email',
    });

    return this.saveSession(response);
  }

  static async completeEmailConfirmation(): Promise<AuthUser | null> {
    const hash = window.location.hash;
    if (!hash) return null;

    const params = new URLSearchParams(hash.slice(1));
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const expiresIn = Number(params.get('expires_in'));
    const errorDescription = params.get('error_description');

    if (errorDescription) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      throw new Error(decodeURIComponent(errorDescription.replace(/\+/g, ' ')));
    }

    if (!accessToken || !refreshToken) return null;

    this.storeSession({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: Date.now() + (Number.isFinite(expiresIn) ? expiresIn : 3600) * 1000,
    });

    try {
      const user = await this.request<AuthUser>('/user', undefined, accessToken);
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      return user;
    } catch (error) {
      this.clearSession();
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      throw error;
    }
  }

  static async getCurrentUser(): Promise<AuthUser | null> {
    const session = this.readSession();
    if (!session) return null;

    let activeSession = session;
    if (session.expires_at <= Date.now() + 60_000) {
      activeSession = await this.refreshSession(session);
    }

    try {
      return await this.request<AuthUser>('/user', undefined, activeSession.access_token);
    } catch (error) {
      if (this.isUnauthorized(error)) {
        activeSession = await this.refreshSession(activeSession);
        return this.request<AuthUser>('/user', undefined, activeSession.access_token);
      }
      throw error;
    }
  }

  static signOut(): void {
    this.clearSession();
  }

  static async getAccessToken(): Promise<string | null> {
    const session = this.readSession();
    if (!session) return null;
    if (session.expires_at <= Date.now() + 60_000) {
      return (await this.refreshSession(session)).access_token;
    }
    return session.access_token;
  }

  private static async refreshSession(session: AuthSession): Promise<AuthSession> {
    try {
      const response = await this.request<AuthResponse>(
        '/token?grant_type=refresh_token',
        { refresh_token: session.refresh_token },
      );
      this.saveSession(response);
      return this.readSession()!;
    } catch (error) {
      this.clearSession();
      throw error;
    }
  }

  static getUserProfile(authUser: AuthUser): User {
    const savedUser = StorageService.getUser();
    const role = authUser.app_metadata?.role === 'admin'
      ? 'admin'
      : authUser.app_metadata?.role === 'pemimpin'
      ? 'pemimpin'
      : 'anggota';
    const metadata = authUser.user_metadata ?? {};
    const trustedOrganizationId = authUser.app_metadata?.organization_id;
    if (StorageService.isOnboarded() && savedUser.id === authUser.id) {
      return {
        ...savedUser,
        role,
        ...(typeof trustedOrganizationId === 'string' ? { communityId: trustedOrganizationId } : {}),
        ...(typeof metadata.organizationName === 'string' ? { communityName: metadata.organizationName } : {}),
        contact: authUser.email || savedUser.contact,
      };
    }

    const communities = StorageService.getCommunities();
    const communityId = typeof trustedOrganizationId === 'string'
      ? trustedOrganizationId
      : typeof metadata.communityId === 'string'
      ? metadata.communityId
      : 'umum';
    const communityName = typeof metadata.communityName === 'string' && metadata.communityName.trim()
      ? metadata.communityName
      : communities.find((community) => community.id === communityId)?.name || 'Komunitas Marsiadapari Hijau';
    const communityCategory = metadata.organizationCategory === 'Kampus' ||
      metadata.organizationCategory === 'Gereja' ||
      metadata.organizationCategory === 'Pemuda'
      ? metadata.organizationCategory
      : 'Komunitas Warga';
    const today = new Date().toISOString().split('T')[0];

    if (
      (communityId.startsWith('comm-') || communityId.startsWith('org-')) &&
      !communities.some((community) => community.id === communityId)
    ) {
      StorageService.addCommunity({
        id: communityId,
        name: communityName,
        category: communityCategory,
        location: 'Tapanuli Utara',
        memberCount: 1,
        totalPoints: 0,
        treesPlanted: 0,
        treeTarget: 200,
        actionCount: 0,
        actionTarget: 500,
        description: 'Komunitas hijau baru yang dibentuk warga/jemaat.',
      });
    }

    return {
      id: authUser.id,
      name: typeof metadata.name === 'string' ? metadata.name : authUser.email || 'Sahabat Hijau',
      contact: authUser.email || '',
      role,
      communityId,
      communityName,
      points: typeof metadata.welcomePoints === 'number' ? metadata.welcomePoints : 0,
      streakDays: 1,
      lastActiveDate: today,
      joinedDate: typeof metadata.joinedDate === 'string' ? metadata.joinedDate : today,
      preferences: {
        fontSize: 'normal',
        darkMode: false,
        dataSaver: false,
        notifications: true,
        isAnonymous: typeof metadata.isAnonymous === 'boolean' ? metadata.isAnonymous : false,
      },
    };
  }

  private static saveSession(response: AuthResponse): AuthUser {
    if (!response.access_token || !response.refresh_token || !response.user) {
      throw new Error('Autentikasi berhasil diproses, tetapi sesi akun tidak diterima. Coba kembali.');
    }

    this.storeSession({
      access_token: response.access_token,
      refresh_token: response.refresh_token,
      expires_at: Date.now() + (response.expires_in ?? 3600) * 1000,
    });
    return response.user;
  }

  private static storeSession(session: AuthSession): void {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  private static readSession(): AuthSession | null {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return null;

    try {
      const session = JSON.parse(stored) as AuthSession;
      if (session.access_token && session.refresh_token && Number.isFinite(session.expires_at)) {
        return session;
      }
    } catch {
      this.clearSession();
    }
    return null;
  }

  private static clearSession(): void {
    localStorage.removeItem(SESSION_KEY);
  }

  private static isUnauthorized(error: unknown): boolean {
    return error instanceof Error && error.message.includes('HTTP 401');
  }

  private static async request<T>(
    path: string,
    body?: Record<string, unknown>,
    accessToken?: string,
  ): Promise<T> {
    if (!this.isConfigured()) {
      throw new Error(
        'Autentikasi belum dikonfigurasi. Tambahkan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di environment aplikasi.',
      );
    }

    const response = await fetch(`${supabaseUrl}/auth/v1${path}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        apikey: supabaseAnonKey!,
        Authorization: `Bearer ${accessToken || supabaseAnonKey}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null) as
        | { msg?: string; message?: string; error_description?: string; error?: string }
        | null;
      const message =
        payload?.msg ||
        payload?.message ||
        payload?.error_description ||
        payload?.error ||
        `Permintaan autentikasi gagal (HTTP ${response.status}).`;
      throw new Error(`${message} (HTTP ${response.status})`);
    }

    return response.json() as Promise<T>;
  }
}
