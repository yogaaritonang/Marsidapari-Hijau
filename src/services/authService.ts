import { User } from '../types';
import { StorageService } from './storageService';
import { UserService } from './userService';

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

export interface EmailConfirmationNotice {
  status: 'confirmed' | 'already_verified' | 'password_recovery' | 'error';
  message: string;
}

let pendingNotice: EmailConfirmationNotice | null = null;

export class AuthService {
  static isConfigured(): boolean {
    return Boolean(supabaseUrl && supabaseAnonKey);
  }

  static getPublicOrigin(): string {
    if (typeof window !== 'undefined' && window.location.origin) {
      const origin = window.location.origin;
      if (!origin.includes('localhost') && !origin.includes('127.0.0.1')) {
        return origin;
      }
    }
    const envUrl = import.meta.env.VITE_APP_URL;
    if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
      return envUrl.replace(/\/+$/, '');
    }
    return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  }

  static consumeConfirmationNotice(): EmailConfirmationNotice | null {
    const notice = pendingNotice;
    pendingNotice = null;
    return notice;
  }

  static async signUp(
    email: string,
    password: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    const origin = this.getPublicOrigin();
    const redirectTo = encodeURIComponent(`${origin}/`);
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

  static async signInWithPassword(email: string, password: string): Promise<AuthUser> {
    const response = await this.request<AuthResponse>('/token?grant_type=password', {
      email,
      password,
    });
    const authUser = this.saveSession(response);
    if (response.access_token) {
      await this.fetchFreshUserProfile(response.access_token).catch(() => null);
    }
    return authUser;
  }

  static async sendPasswordResetEmail(email: string): Promise<void> {
    const redirectTo = encodeURIComponent(`${this.getPublicOrigin()}/?password_recovery=true`);
    await this.request(`/recover?redirect_to=${redirectTo}`, { email });
  }

  static async updatePassword(password: string): Promise<void> {
    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      throw new Error('Tautan pemulihan tidak aktif. Minta tautan lupa kata sandi yang baru.');
    }
    await this.request<AuthUser>('/user', { password }, accessToken, 'PUT');
  }

  static async updateProfileMetadata(metadata: Record<string, unknown>): Promise<void> {
    const authUser = await this.getCurrentUser();
    const accessToken = await this.getAccessToken();
    if (!authUser || !accessToken) {
      throw new Error('Sesi masuk tidak ditemukan. Silakan masuk kembali sebelum mengubah profil.');
    }

    await this.request<AuthUser>(
      '/user',
      { data: { ...(authUser.user_metadata ?? {}), ...metadata } },
      accessToken,
      'PUT',
    );
  }

  static async requestEmailChange(email: string): Promise<void> {
    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      throw new Error('Sesi masuk tidak ditemukan. Silakan masuk kembali sebelum mengubah email.');
    }

    await this.request<AuthUser>(
      '/user',
      { email: email.trim().toLowerCase() },
      accessToken,
      'PUT',
    );
  }

  static async completeEmailConfirmation(): Promise<AuthUser | null> {
    if (typeof window === 'undefined') return null;

    const hash = window.location.hash ? window.location.hash.slice(1) : '';
    const hashParams = new URLSearchParams(hash);
    const searchParams = new URLSearchParams(window.location.search);

    const errorCode = hashParams.get('error_code') || searchParams.get('error_code');
    const errorDescription = hashParams.get('error_description') || searchParams.get('error_description') || hashParams.get('error') || searchParams.get('error');
    const emailConfirmedParam = searchParams.get('email_confirmed');
    const isPasswordRecovery =
      hashParams.get('type') === 'recovery' ||
      searchParams.get('type') === 'recovery' ||
      searchParams.get('password_recovery') === 'true';

    // 1. Handle error cases gracefully (e.g. 404 from expired or already clicked link)
    if (errorCode === '404' || (errorDescription && /invalid|expired|404|already/i.test(errorDescription))) {
      this.cleanAuthUrlParams();
      pendingNotice = {
        status: 'already_verified',
        message: 'Tautan konfirmasi sudah digunakan atau akun Anda telah aktif. Silakan masuk dengan email dan kata sandi Anda.',
      };
      return null;
    }

    if (errorDescription) {
      this.cleanAuthUrlParams();
      pendingNotice = {
        status: 'error',
        message: decodeURIComponent(errorDescription.replace(/\+/g, ' ')),
      };
      return null;
    }

    // 2. Handle server redirect queries
    if (emailConfirmedParam === 'already_verified') {
      this.cleanAuthUrlParams();
      pendingNotice = {
        status: 'already_verified',
        message: 'Tautan konfirmasi sudah digunakan atau akun Anda telah aktif. Silakan masuk dengan email dan kata sandi Anda.',
      };
      return null;
    }

    // 3. Extract tokens from hash or search
    const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');
    const expiresIn = Number(hashParams.get('expires_in') || searchParams.get('expires_in'));

    if (accessToken && refreshToken) {
      this.storeSession({
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: Date.now() + (Number.isFinite(expiresIn) ? expiresIn : 3600) * 1000,
      });

      try {
        const user = await this.request<AuthUser>('/user', undefined, accessToken);
        this.cleanAuthUrlParams();
        pendingNotice = isPasswordRecovery
          ? {
              status: 'password_recovery',
              message: 'Tautan pemulihan berhasil diverifikasi. Silakan buat kata sandi baru.',
            }
          : {
              status: 'confirmed',
              message: '✨ Email berhasil dikonfirmasi! Akun Anda telah aktif dan siap digunakan.',
            };
        return user;
      } catch (error) {
        this.clearSession();
        this.cleanAuthUrlParams();
        console.warn('Session check after confirmation token failed:', error);
        pendingNotice = {
          status: 'already_verified',
          message: 'Email berhasil dikonfirmasi. Silakan masuk dengan email dan kata sandi Anda.',
        };
        return null;
      }
    }

    // 4. Handle client-side token_hash verification if landed directly on client
    const tokenHash = searchParams.get('token_hash') || searchParams.get('token');
    const type = searchParams.get('type') || 'signup';
    if (tokenHash) {
      try {
        const response = await this.request<AuthResponse>(
          `/verify?token=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(type)}`,
        );
        const user = this.saveSession(response);
        this.cleanAuthUrlParams();
        pendingNotice = isPasswordRecovery
          ? {
              status: 'password_recovery',
              message: 'Tautan pemulihan berhasil diverifikasi. Silakan buat kata sandi baru.',
            }
          : {
              status: 'confirmed',
              message: '✨ Email berhasil dikonfirmasi! Akun Anda telah aktif.',
            };
        return user;
      } catch (verifyError) {
        this.cleanAuthUrlParams();
        console.warn('Client token_hash verification fallback:', verifyError);
        pendingNotice = {
          status: 'already_verified',
          message: 'Tautan konfirmasi sudah digunakan atau akun telah aktif. Silakan masuk dengan email dan kata sandi.',
        };
        return null;
      }
    }

    // 5. Handle PKCE code
    const code = searchParams.get('code');
    if (code) {
      try {
        const response = await this.request<AuthResponse>(
          '/token?grant_type=pkce',
          { auth_code: code },
        );
        const user = this.saveSession(response);
        this.cleanAuthUrlParams();
        pendingNotice = isPasswordRecovery
          ? {
              status: 'password_recovery',
              message: 'Tautan pemulihan berhasil diverifikasi. Silakan buat kata sandi baru.',
            }
          : {
              status: 'confirmed',
              message: '✨ Email berhasil dikonfirmasi! Akun Anda telah aktif.',
            };
        return user;
      } catch (codeError) {
        this.cleanAuthUrlParams();
        console.warn('PKCE exchange fallback:', codeError);
        pendingNotice = {
          status: 'already_verified',
          message: 'Tautan konfirmasi sudah digunakan atau akun telah aktif. Silakan masuk.',
        };
        return null;
      }
    }

    // 6. Handle ?email_confirmed=true without tokens
    if (emailConfirmedParam === 'true') {
      this.cleanAuthUrlParams();
      pendingNotice = {
        status: 'confirmed',
        message: '✨ Email berhasil dikonfirmasi! Akun Anda telah aktif. Silakan masuk.',
      };
      return null;
    }

    return null;
  }

  private static cleanAuthUrlParams(): void {
    if (typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('token_hash');
      url.searchParams.delete('token');
      url.searchParams.delete('type');
      url.searchParams.delete('code');
      url.searchParams.delete('error');
      url.searchParams.delete('error_code');
      url.searchParams.delete('error_description');
      url.searchParams.delete('email_confirmed');
      url.searchParams.delete('password_recovery');
      const nextSearch = url.searchParams.toString();
      const finalUrl = `${url.pathname}${nextSearch ? `?${nextSearch}` : ''}`;
      window.history.replaceState(null, '', finalUrl);
    } catch {
      window.history.replaceState(null, '', window.location.pathname);
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
    StorageService.resetPersistentSync();
  }

  static async signOutOtherSessions(): Promise<void> {
    const accessToken = await this.getAccessToken();
    if (!accessToken) throw new Error('Sesi masuk tidak ditemukan. Silakan masuk kembali.');
    await this.request<void>('/logout?scope=others', undefined, accessToken, 'POST');
  }

  static async deleteAccount(): Promise<void> {
    const accessToken = await this.getAccessToken();
    const authUser = await this.getCurrentUser();
    if (!accessToken || !authUser) {
      throw new Error('Sesi masuk tidak ditemukan. Silakan masuk kembali sebelum menghapus akun.');
    }

    const response = await fetch('/api/account/delete', {
      method: 'POST',
      headers: { Authorization: 'Bearer '.concat(accessToken) },
    });
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    if (!response.ok) {
      throw new Error(payload?.error || 'Akun gagal dihapus. Silakan coba kembali.');
    }

    StorageService.applyUserDataReset(authUser.id, new Date().toISOString());
    this.clearSession();
    StorageService.resetPersistentSync();
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
    const resetAt = authUser.app_metadata?.data_reset_at;
    if (typeof resetAt === 'string') {
      StorageService.applyUserDataReset(authUser.id, resetAt);
    }
    const user = UserService.resolveProfileConflict(authUser, { clearStaleCache: true });

    // Pastikan jika komunitas baru dari pemimpin terdaftar di communities
    const communities = StorageService.getCommunities();
    if (
      (user.communityId.startsWith('comm-') || user.communityId.startsWith('org-')) &&
      !communities.some((c) => c.id === user.communityId)
    ) {
      StorageService.addCommunity({
        id: user.communityId,
        name: user.communityName,
        category: 'Komunitas Warga',
        location: 'Tapanuli Utara',
        memberCount: 0,
        totalPoints: 0,
        treesPlanted: 0,
        treeTarget: 200,
        actionCount: 0,
        actionTarget: 500,
        description: 'Komunitas hijau baru yang dibentuk warga/jemaat.',
      });
    }

    return user;
  }

  /**
   * Mengambil profil pengguna secara segar (fresh fetch) dari server Supabase
   * untuk mengatasi konflik data, membersihkan cache lokal basi, dan memastikan
   * poin, streak, serta afiliasi organisasi selalu sinkron dengan state server.
   */
  static async fetchFreshUserProfile(token?: string): Promise<User | null> {
    const activeToken = token || (await this.getAccessToken());
    if (!activeToken) return null;

    try {
      const freshAuthUser = await this.request<AuthUser>('/user', undefined, activeToken);
      const user = this.getUserProfile(freshAuthUser);
      StorageService.applyAuthUserSnapshot(user);
      window.dispatchEvent(new CustomEvent('mh-user-updated', { detail: user }));
      window.dispatchEvent(new CustomEvent('mh-data-updated', { detail: { collection: 'user', values: [user] } }));
      return user;
    } catch (err) {
      console.warn('Fresh fetch profil Supabase gagal, menggunakan cache lokal:', err);
      return null;
    }
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
    method?: 'GET' | 'POST' | 'PUT',
  ): Promise<T> {
    if (!this.isConfigured()) {
      throw new Error(
        'Autentikasi belum dikonfigurasi. Tambahkan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di environment aplikasi.',
      );
    }

    const response = await fetch(`${supabaseUrl}/auth/v1${path}`, {
      method: method ?? (body ? 'POST' : 'GET'),
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
      const emailRateLimitHint = response.status === 429 &&
        /email|rate.?limit|too many requests/i.test(message)
        ? ' Supabase membatasi pengiriman email. Tunggu sebelum mencoba lagi; untuk produksi, atur SMTP khusus karena pengirim bawaan memiliki kuota sangat rendah.'
        : '';
      throw new Error(`${message} (HTTP ${response.status}).${emailRateLimitHint}`);
    }

    const responseText = await response.text();
    return (responseText ? JSON.parse(responseText) : undefined) as T;
  }
}
