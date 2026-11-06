import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Leaf,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
  X,
  UserCheck,
} from 'lucide-react';
import { User, Community } from '../types';
import { StorageService } from '../services/storageService';
import { AuthService } from '../services/authService';

interface OnboardingModalProps {
  onComplete: (user: User) => void;
  onClose?: () => void;
  initialError?: string | null;
  initialMode?: AuthMode;
  initialPasswordRecovery?: boolean;
  onPasswordResetComplete?: () => void;
  portal?: 'user' | 'leader' | 'admin';
}

type AuthMode = 'register' | 'login';
type AuthStage = 'form' | 'confirmation' | 'reset-request' | 'recovery';

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  onComplete,
  onClose,
  initialError,
  initialMode,
  initialPasswordRecovery = false,
  onPasswordResetComplete,
  portal = 'user',
}) => {
  const [mode, setMode] = useState<AuthMode>(portal === 'admin' ? 'login' : initialMode || 'register');
  const [stage, setStage] = useState<AuthStage>(initialPasswordRecovery ? 'recovery' : 'form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [communityId, setCommunityId] = useState('umum');
  const [organizationName, setOrganizationName] = useState('');
  const [organizationCategory, setOrganizationCategory] = useState('Komunitas Warga');
  const invitationCode = new URLSearchParams(window.location.search).get('undangan') || '';
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(initialError ?? null);

  const [brand, setBrand] = useState(() => StorageService.getBrandSettings());
  const [communities, setCommunities] = useState<Community[]>(() => StorageService.getCommunities());
  const cleanEmail = email.trim().toLowerCase();

  React.useEffect(() => {
    const handleCommunitiesUpdate = () => {
      setCommunities(StorageService.getCommunities());
    };
    const handleBrandUpdate = () => {
      setBrand(StorageService.getBrandSettings());
    };
    window.addEventListener('mh-data-updated', handleCommunitiesUpdate);
    window.addEventListener('mh-shared-data-change', handleCommunitiesUpdate);
    window.addEventListener('mh-brand-updated', handleBrandUpdate);
    return () => {
      window.removeEventListener('mh-data-updated', handleCommunitiesUpdate);
      window.removeEventListener('mh-shared-data-change', handleCommunitiesUpdate);
      window.removeEventListener('mh-brand-updated', handleBrandUpdate);
    };
  }, []);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setStage('form');
    setMessage(null);
    setError(null);
  };

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (password.length < 8) {
      setError('Kata sandi harus terdiri dari minimal 8 karakter.');
      return;
    }
    setIsLoading(true);
    try {
      if (portal === 'leader') {
        if (!invitationCode) {
          throw new Error('Gunakan tautan undangan khusus dari pengelola untuk membuat akun pemimpin.');
        }
        if (organizationName.trim().length < 2) {
          throw new Error('Nama organisasi minimal 2 karakter.');
        }
        await AuthService.registerLeader(invitationCode, cleanEmail, password, {
          name: name.trim(),
          organizationName: organizationName.trim(),
          organizationCategory,
        });
      } else {
        const selectedCommunityName = communities.find((community) => community.id === communityId)?.name || 'Komunitas Marsiadapari Hijau';
        await AuthService.signUp(cleanEmail, password, {
          name: name.trim(),
          communityId,
          communityName: selectedCommunityName,
          isAnonymous,
          joinedDate: new Date().toISOString().split('T')[0],
        });
      }
      setStage('confirmation');
      setMessage(`Tautan konfirmasi telah dikirim ke ${cleanEmail}. Buka email tersebut untuk mengaktifkan akun.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Pendaftaran gagal. Coba kembali.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);
    try {
      const authUser = await AuthService.signInWithPassword(cleanEmail, password);
      const user = AuthService.getUserProfile(authUser);
      const expectedRole = portal === 'admin' ? 'admin' : portal === 'leader' ? 'pemimpin' : 'anggota';
      if (user.role !== expectedRole) {
        AuthService.signOut();
        throw new Error(
          portal === 'admin'
            ? 'Akun ini tidak memiliki akses admin.'
            : portal === 'leader'
            ? 'Akun ini bukan akun pemimpin organisasi.'
            : 'Gunakan tautan portal khusus untuk masuk sebagai pemimpin atau admin.',
        );
      }
      StorageService.saveUser(user);
      StorageService.setOnboarded(true);
      onComplete(user);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Email atau kata sandi tidak valid.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestPasswordReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (!cleanEmail) {
      setError('Masukkan email akun terlebih dahulu.');
      return;
    }

    setIsLoading(true);
    try {
      await AuthService.sendPasswordResetEmail(cleanEmail);
      setMessage(`Jika akun dengan email ${cleanEmail} terdaftar, tautan pemulihan kata sandi akan dikirim ke email tersebut.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Tautan pemulihan gagal dikirim.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (password.length < 8) {
      setError('Kata sandi harus terdiri dari minimal 8 karakter.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Konfirmasi kata sandi belum sama.');
      return;
    }

    setIsLoading(true);
    try {
      await AuthService.updatePassword(password);
      AuthService.signOut();
      setMessage('Kata sandi berhasil diperbarui. Silakan masuk menggunakan kata sandi baru.');
      onPasswordResetComplete?.();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Kata sandi gagal diperbarui.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setStage('form');
    setError(null);
    setMessage(null);
  };

  const handleOpenPasswordReset = () => {
    setStage('reset-request');
    setError(null);
    setMessage(null);
  };

  const handleGuestLogin = () => {
    const primaryComm = communities[0] || {
      id: 'org-hkbp-tarutung',
      name: 'HKBP Tarutung Kota',
    };
    const role = portal === 'admin' ? 'admin' : portal === 'leader' ? 'pemimpin' : 'anggota';
    const roleTitle = portal === 'admin' ? 'Admin' : portal === 'leader' ? 'Pemimpin' : 'Tamu Panitia';

    const guestUser: User = {
      id: `guest-panitia-${Date.now().toString(36)}`,
      name: `Panitia Penilai (${roleTitle})`,
      contact: 'panitia@marsiadapari.org',
      role,
      communityId: primaryComm.id,
      communityName: primaryComm.name,
      points: 250,
      streakDays: 7,
      lastActiveDate: new Date().toISOString().split('T')[0],
      joinedDate: new Date().toISOString().split('T')[0],
      preferences: {
        fontSize: 'normal',
        darkMode: false,
        dataSaver: false,
        notifications: true,
        isAnonymous: false,
      },
    };

    StorageService.saveUser(guestUser);
    StorageService.setOnboarded(true);
    window.dispatchEvent(new CustomEvent('mh-user-updated', { detail: guestUser }));
    if (onClose) onClose();
    onComplete(guestUser);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#17251a]/70 p-3 backdrop-blur-sm sm:items-center sm:p-6">
      <section
        aria-labelledby="auth-heading"
        className="relative my-3 w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/60 dark:border-[#2E6B34]/30 bg-[#FAF6EC] dark:bg-[#142518] text-[#1F2A1F] dark:text-white shadow-[0_30px_100px_rgba(15,35,18,0.5)] sm:my-auto"
      >
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup formulir akun"
            className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 dark:bg-black/60 text-gray-600 dark:text-gray-300 shadow-sm transition hover:bg-white dark:hover:bg-black hover:text-[#2E6B34] sm:right-4 sm:top-4 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        )}
        <div className="grid min-h-[min(620px,calc(100dvh-1.5rem))] md:min-h-[620px] md:grid-cols-[0.88fr_1.12fr]">
          <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#214d2a] via-[#2E6B34] to-[#183d24] p-8 text-white lg:flex lg:p-10">
            <div className="absolute -right-28 -top-20 h-80 w-80 rounded-full border border-white/10" />
            <div className="absolute -bottom-28 -left-20 h-80 w-80 rounded-full border border-white/10" />
            <div className="absolute bottom-20 right-6 h-48 w-48 rounded-full bg-[#A8D5A2]/10 blur-2xl" />

            <div className="relative z-10 flex items-center gap-3">
              {brand.logoUrl && brand.logoUrl.trim() ? (
                <div className="flex h-12 items-center justify-center shrink-0">
                  <img
                    src={brand.logoUrl}
                    alt={brand.name || 'Logo'}
                    className="max-h-12 max-w-16 object-contain drop-shadow-md"
                  />
                </div>
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
                  <Leaf className="h-6 w-6 text-[#B9E0A9]" />
                </span>
              )}
              <div>
                <p className="font-poppins text-sm font-bold tracking-wide">{brand.name || 'Marsiadapari'}</p>
                <p className="text-xs text-white/65">Hijau · Danau Toba</p>
              </div>
            </div>

            <div className="relative z-10 max-w-sm">
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-[#C6E5B9]">
                Merawat ciptaan bersama
              </p>
              <h1 className="font-poppins text-4xl font-bold leading-tight">
                Aksi kecil,
                <br />
                dampak agung.
              </h1>
              <p className="mt-5 text-sm leading-7 text-white/75">
                Bergabunglah dalam gerakan hijau jemaat dan mahasiswa. Tumbuhkan kebiasaan baik, rawat bumi, dan bergerak bersama.
              </p>
              <div className="mt-8 flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-4">
                <ShieldCheck className="h-5 w-5 shrink-0 text-[#B9E0A9]" />
                <p className="text-xs leading-5 text-white/80">
                  Email diverifikasi untuk menjaga akun dan komunitas tetap aman.
                </p>
              </div>
            </div>

            <p className="relative z-10 text-xs text-white/55">
              “Tuhanlah yang empunya bumi serta segala isinya.” · Mazmur 24:1
            </p>
          </aside>

          <div className="flex min-w-0 flex-col p-4 sm:p-8 lg:p-10">
            <div className="mb-7 flex items-center gap-3 md:hidden">
              {brand.logoUrl && brand.logoUrl.trim() ? (
                <div className="flex h-11 items-center justify-center shrink-0">
                  <img
                    src={brand.logoUrl}
                    alt={brand.name || 'Logo'}
                    className="max-h-11 max-w-14 object-contain drop-shadow-sm"
                  />
                </div>
              ) : (
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2E6B34] text-white">
                  <Leaf className="h-5 w-5 text-[#B9E0A9]" />
                </span>
              )}
              <div>
                <p className="font-poppins text-sm font-bold text-[#1F2A1F] dark:text-[#E8EFE8]">{brand.name || 'Marsiadapari Hijau'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Aksi kecil, dampak agung</p>
              </div>
            </div>

            {stage === 'confirmation' ? (
              <div className="m-auto w-full max-w-md text-center">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E4F2DE] text-[#2E6B34]">
                  <CheckCircle2 className="h-8 w-8" />
                </span>
                <h2 id="auth-heading" className="mt-6 font-poppins text-2xl font-bold text-[#1F2A1F]">
                  Periksa email Anda
                </h2>
                <p className="mt-3 text-sm leading-6 text-gray-600">{message}</p>
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-left text-xs leading-5 text-emerald-900">
                  <p className="font-semibold">💡 Panduan Aktivasi:</p>
                  <p className="mt-1">
                    Buka email dan klik tautan konfirmasi. Jika tautan sudah dibuka, akun Anda langsung aktif dan dapat digunakan untuk masuk kapan saja.
                  </p>
                </div>
                {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
                <div className="mt-6 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2E6B34] px-4 text-sm font-bold text-white shadow-lg shadow-[#2E6B34]/20 transition hover:bg-[#24582B]"
                  >
                    Sudah Konfirmasi? Masuk Sekarang
                  </button>
                  <button
                    type="button"
                    onClick={handleBack}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-xs font-semibold text-gray-500 hover:text-[#2E6B34]"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Ganti data atau kembali
                  </button>
                </div>
              </div>
            ) : stage === 'reset-request' ? (
              <div className="m-auto w-full max-w-md">
                <div className="mb-7">
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#7A5230]">
                    Pemulihan akun
                  </p>
                  <h2 id="auth-heading" className="font-poppins text-2xl font-bold text-[#1F2A1F] sm:text-3xl">
                    Lupa kata sandi?
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    Masukkan email akun Anda. Kami akan mengirim tautan untuk membuat kata sandi baru.
                  </p>
                </div>
                <form onSubmit={handleRequestPasswordReset} className="space-y-4">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold text-[#354235]">Email akun</span>
                    <span className="relative block">
                      <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        required
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="nama@email.com"
                        className="min-h-12 w-full rounded-xl border border-[#D8D7CA] bg-white pl-10 pr-3 text-sm outline-none transition focus:border-[#2E6B34] focus:ring-4 focus:ring-[#2E6B34]/10"
                      />
                    </span>
                  </label>
                  {message && <p role="status" className="rounded-xl border border-[#CEE2C6] bg-[#EDF6E9] p-3 text-sm text-[#2E6B34]">{message}</p>}
                  {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
                  <button
                    type="submit"
                    disabled={isLoading || !cleanEmail}
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2E6B34] px-4 text-sm font-bold text-white shadow-lg shadow-[#2E6B34]/20 transition hover:bg-[#24582B] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {isLoading && <LoaderCircle className="h-4 w-4 animate-spin" />}
                    Kirim tautan pemulihan
                  </button>
                  <button
                    type="button"
                    onClick={handleBack}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-xs font-semibold text-gray-500 hover:text-[#2E6B34]"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Kembali ke halaman masuk
                  </button>
                </form>
              </div>
            ) : stage === 'recovery' ? (
              <div className="m-auto w-full max-w-md">
                <div className="mb-7">
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#7A5230]">
                    Pemulihan akun
                  </p>
                  <h2 id="auth-heading" className="font-poppins text-2xl font-bold text-[#1F2A1F] sm:text-3xl">
                    Buat kata sandi baru
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    Gunakan minimal 8 karakter, lalu konfirmasikan kata sandi yang sama.
                  </p>
                </div>
                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold text-[#354235]">Kata sandi baru</span>
                    <input
                      required
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Minimal 8 karakter"
                      className="min-h-12 w-full rounded-xl border border-[#D8D7CA] bg-white px-3 text-sm outline-none transition focus:border-[#2E6B34] focus:ring-4 focus:ring-[#2E6B34]/10"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold text-[#354235]">Konfirmasi kata sandi</span>
                    <input
                      required
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Ulangi kata sandi baru"
                      className="min-h-12 w-full rounded-xl border border-[#D8D7CA] bg-white px-3 text-sm outline-none transition focus:border-[#2E6B34] focus:ring-4 focus:ring-[#2E6B34]/10"
                    />
                  </label>
                  {message && <p role="status" className="rounded-xl border border-[#CEE2C6] bg-[#EDF6E9] p-3 text-sm text-[#2E6B34]">{message}</p>}
                  {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2E6B34] px-4 text-sm font-bold text-white shadow-lg shadow-[#2E6B34]/20 transition hover:bg-[#24582B] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {isLoading && <LoaderCircle className="h-4 w-4 animate-spin" />}
                    Simpan kata sandi baru
                  </button>
                </form>
              </div>
            ) : (
              <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
                <div className="mb-7">
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#7A5230]">
                    Selamat datang
                  </p>
                  <h2 id="auth-heading" className="font-poppins text-2xl font-bold text-[#1F2A1F] sm:text-3xl">
                    {portal === 'admin'
                      ? 'Masuk admin'
                      : portal === 'leader'
                      ? mode === 'register' ? 'Daftar sebagai pemimpin' : 'Masuk portal pemimpin'
                      : mode === 'register' ? 'Buat akun baru' : 'Masuk ke akun'}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    {portal === 'admin'
                      ? 'Akses khusus administrator aplikasi.'
                      : portal === 'leader'
                      ? mode === 'register'
                        ? 'Daftarkan akun pemimpin dan organisasi Anda.'
                        : 'Masuk untuk mengelola organisasi Anda.'
                      : mode === 'register'
                      ? 'Daftar untuk mulai bergotong royong merawat ciptaan.'
                      : 'Masuk menggunakan email akun yang sudah terdaftar.'}
                  </p>
                </div>

                {stage === 'form' && portal !== 'admin' && (
                  <div className="mb-6 grid grid-cols-2 rounded-2xl bg-[#EDE9DC] dark:bg-white/10 p-1">
                    <button
                      type="button"
                      aria-pressed={mode === 'register'}
                      onClick={() => switchMode('register')}
                      className={`min-h-11 rounded-xl text-sm font-bold transition ${
                        mode === 'register'
                          ? 'bg-white dark:bg-[#1E2E20] text-[#2E6B34] dark:text-emerald-400 shadow-sm'
                          : 'text-gray-500 dark:text-gray-400 hover:text-[#1F2A1F] dark:hover:text-white'
                      }`}
                    >
                      {portal === 'leader' ? 'Daftar Pemimpin' : 'Daftar'}
                    </button>
                    <button
                      type="button"
                      aria-pressed={mode === 'login'}
                      onClick={() => switchMode('login')}
                      className={`min-h-11 rounded-xl text-sm font-bold transition ${
                        mode === 'login'
                          ? 'bg-white dark:bg-[#1E2E20] text-[#2E6B34] dark:text-emerald-400 shadow-sm'
                          : 'text-gray-500 dark:text-gray-400 hover:text-[#1F2A1F] dark:hover:text-white'
                      }`}
                    >
                      {portal === 'leader' ? 'Masuk Pemimpin' : 'Masuk'}
                    </button>
                  </div>
                )}

                {stage === 'form' && (
                  <div className="mb-5 rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10 p-3.5 transition hover:border-emerald-500/60">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                        <UserCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        Akses Penilaian Panitia / Tamu
                      </span>
                      <span className="rounded-full bg-emerald-600/20 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                        Instan
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300 mb-3">
                      Khusus dewan juri & panitia lomba: Klik tombol di bawah untuk langsung masuk dan menguji seluruh fitur aplikasi (aksi gotong royong, kebun virtual, liturgi, peta hijau, dll.) tanpa perlu verifikasi email.
                    </p>
                    <button
                      type="button"
                      onClick={handleGuestLogin}
                      className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2E6B34] to-[#1E4D25] hover:from-[#24582B] hover:to-[#173D1D] px-4 text-xs font-bold text-white shadow-md shadow-emerald-950/20 transition cursor-pointer"
                    >
                      <UserRound className="h-4 w-4" />
                      <span>Masuk sebagai Tamu (Mode Penilaian Panitia)</span>
                    </button>
                    <div className="relative my-3">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200 dark:border-white/10" />
                      </div>
                      <div className="relative flex justify-center text-[10px] uppercase">
                        <span className="bg-[#FAF6EC] dark:bg-[#142518] px-2 text-gray-400 font-semibold tracking-wider">
                          Atau Gunakan Email Pribadi
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                  <form onSubmit={mode === 'register' ? handleRegister : handleLogin} className="space-y-4">
                    {mode === 'register' && (
                      <>
                        <label className="block">
                          <span className="mb-1.5 block text-xs font-bold text-[#354235]">Nama lengkap</span>
                          <span className="relative block">
                            <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                              required
                              autoComplete="name"
                              value={name}
                              onChange={(event) => setName(event.target.value)}
                              placeholder="Nama Anda"
                              className="min-h-12 w-full rounded-xl border border-[#D8D7CA] bg-white pl-10 pr-3 text-sm outline-none transition focus:border-[#2E6B34] focus:ring-4 focus:ring-[#2E6B34]/10"
                            />
                          </span>
                        </label>
                      </>
                    )}

                    <label className="block">
                      <span className="mb-1.5 block text-xs font-bold text-[#354235]">Email</span>
                      <span className="relative block">
                        <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                          required
                          type="email"
                          autoComplete="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          placeholder="nama@email.com"
                          className="min-h-12 w-full rounded-xl border border-[#D8D7CA] bg-white pl-10 pr-3 text-sm outline-none transition focus:border-[#2E6B34] focus:ring-4 focus:ring-[#2E6B34]/10"
                        />
                      </span>
                    </label>

                    {mode === 'register' && (
                      <>
                        <label className="block">
                          <span className="mb-1.5 block text-xs font-bold text-[#354235]">Kata sandi <span className="font-normal text-gray-500">(minimal 8 karakter)</span></span>
                          <span className="relative block">
                            <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                              required
                              type={showPassword ? 'text' : 'password'}
                              autoComplete="new-password"
                              minLength={8}
                              value={password}
                              onChange={(event) => setPassword(event.target.value)}
                              placeholder="Buat kata sandi"
                              className="min-h-12 w-full rounded-xl border border-[#D8D7CA] bg-white pl-10 pr-11 text-sm outline-none transition focus:border-[#2E6B34] focus:ring-4 focus:ring-[#2E6B34]/10"
                            />
                            <button
                              type="button"
                              aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                              onClick={() => setShowPassword((visible) => !visible)}
                              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </span>
                        </label>

                        {portal === 'leader' ? (
                          <div className="space-y-3 rounded-2xl border border-[#CEE2C6] bg-[#EDF6E9] p-4">
                            <p className="text-xs leading-5 text-[#35533A]">
                              Akun ini khusus untuk pengelola organisasi. Organisasi akan langsung dibuat setelah email dikonfirmasi.
                            </p>
                            <label className="block">
                              <span className="mb-1.5 block text-xs font-bold text-[#354235]">Nama organisasi</span>
                              <input
                                required
                                minLength={2}
                                value={organizationName}
                                onChange={(event) => setOrganizationName(event.target.value)}
                                placeholder="Nama gereja, kampus, atau komunitas"
                                className="min-h-12 w-full rounded-xl border border-[#D8D7CA] bg-white px-3 text-sm outline-none transition focus:border-[#2E6B34] focus:ring-4 focus:ring-[#2E6B34]/10"
                              />
                            </label>
                            <label className="block">
                              <span className="mb-1.5 block text-xs font-bold text-[#354235]">Jenis organisasi</span>
                              <select
                                value={organizationCategory}
                                onChange={(event) => setOrganizationCategory(event.target.value)}
                                className="min-h-12 w-full rounded-xl border border-[#D8D7CA] bg-white px-3 text-sm outline-none focus:border-[#2E6B34] focus:ring-4 focus:ring-[#2E6B34]/10"
                              >
                                <option>Kampus</option>
                                <option>Gereja</option>
                                <option>Pemuda</option>
                                <option>Komunitas Warga</option>
                              </select>
                            </label>
                          </div>
                        ) : (
                          <>
                            <label className="block">
                              <span className="mb-1.5 block text-xs font-bold text-[#354235]">Komunitas / gereja</span>
                              <select
                                value={communityId}
                                onChange={(event) => setCommunityId(event.target.value)}
                                className="min-h-12 w-full rounded-xl border border-[#D8D7CA] bg-white px-3 text-sm outline-none transition focus:border-[#2E6B34] focus:ring-4 focus:ring-[#2E6B34]/10"
                              >
                                {communities.length === 0 && (
                                  <option value="umum">Komunitas Marsiadapari Hijau</option>
                                )}
                                {communities.map((community) => (
                                  <option key={community.id} value={community.id}>
                                    {community.name}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-[#E6E2D6] bg-white/70 p-3">
                          <input
                            type="checkbox"
                            checked={isAnonymous}
                            onChange={(event) => setIsAnonymous(event.target.checked)}
                            className="mt-0.5 accent-[#2E6B34]"
                          />
                          <span className="text-xs leading-5 text-gray-600">
                            <span className="block font-semibold text-[#354235]">Tampilkan saya sebagai anonim</span>
                            Nama tidak ditampilkan di papan capaian komunitas.
                          </span>
                            </label>
                          </>
                        )}

                        <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-5 text-gray-600">
                          <input
                            required
                            type="checkbox"
                            checked={agreePrivacy}
                            onChange={(event) => setAgreePrivacy(event.target.checked)}
                            className="mt-0.5 accent-[#2E6B34]"
                          />
                          <span>Saya menyetujui kebijakan privasi dan penggunaan data aplikasi.</span>
                        </label>
                      </>
                    )}

                    {mode === 'login' && (
                      <label className="block">
                        <span className="mb-1.5 flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[#354235]">Kata sandi</span>
                          {portal !== 'admin' && (
                            <button
                              type="button"
                              disabled={isLoading}
                              onClick={handleOpenPasswordReset}
                              className="min-h-7 text-xs font-semibold text-[#2E6B34] hover:underline disabled:opacity-50"
                            >
                              Lupa kata sandi?
                            </button>
                          )}
                        </span>
                        <span className="relative block">
                          <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                          <input
                            required
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="current-password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder="Masukkan kata sandi"
                            className="min-h-12 w-full rounded-xl border border-[#D8D7CA] bg-white pl-10 pr-11 text-sm outline-none transition focus:border-[#2E6B34] focus:ring-4 focus:ring-[#2E6B34]/10"
                          />
                          <button
                            type="button"
                            aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                            onClick={() => setShowPassword((visible) => !visible)}
                            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </span>
                      </label>
                    )}

                    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm leading-5 text-red-700">{error}</p>}
                    {portal === 'leader' && mode === 'register' && !invitationCode && (
                      <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                        Pendaftaran organisasi hanya tersedia melalui tautan undangan khusus dari pengelola.
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={isLoading || !cleanEmail || (mode === 'register' && (!name.trim() || !agreePrivacy || (portal === 'leader' && (!invitationCode || organizationName.trim().length < 2))))}
                      className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2E6B34] px-4 text-sm font-bold text-white shadow-lg shadow-[#2E6B34]/20 transition hover:bg-[#24582B] disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      {isLoading && <LoaderCircle className="h-4 w-4 animate-spin" />}
                      {mode === 'register'
                        ? portal === 'leader' ? 'Buat akun & organisasi' : 'Daftar'
                        : 'Masuk'}
                    </button>

                    {mode === 'login' && portal !== 'admin' && (
                      <p className="text-center text-xs leading-5 text-gray-500">
                        {portal === 'leader' ? (
                          <>
                            Perlu mendaftarkan organisasi?{' '}
                            <button type="button" onClick={() => switchMode('register')} className="font-bold text-[#2E6B34] hover:underline">
                              Daftar sebagai pemimpin
                            </button>
                          </>
                        ) : (
                          <>
                            Belum memiliki akun?{' '}
                            <button type="button" onClick={() => switchMode('register')} className="font-bold text-[#2E6B34] hover:underline">
                              Daftar sekarang
                            </button>
                          </>
                        )}
                      </p>
                    )}
                  </form>

                <div className="mt-auto flex items-center justify-center gap-2 pt-6 text-[11px] text-gray-400">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Email terverifikasi · Masuk dengan kata sandi · Komunitas bertumbuh
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
