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
} from 'lucide-react';
import { User } from '../types';
import { StorageService } from '../services/storageService';
import { AuthService } from '../services/authService';

interface OnboardingModalProps {
  onComplete: (user: User) => void;
  onClose?: () => void;
  initialError?: string | null;
  initialMode?: AuthMode;
  portal?: 'user' | 'leader' | 'admin';
}

type AuthMode = 'register' | 'login';
type AuthStage = 'form' | 'code' | 'confirmation';

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  onComplete,
  onClose,
  initialError,
  initialMode,
  portal = 'user',
}) => {
  const [mode, setMode] = useState<AuthMode>(portal === 'admin' ? 'login' : initialMode || 'register');
  const [stage, setStage] = useState<AuthStage>('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
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

  const communities = StorageService.getCommunities();
  const cleanEmail = email.trim().toLowerCase();

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

  const handleRequestCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);
    try {
      await AuthService.sendLoginCode(cleanEmail);
      setStage('code');
      setMessage(`Kode verifikasi 6 digit telah dikirim ke ${cleanEmail}.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Kode verifikasi gagal dikirim.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const authUser = await AuthService.verifyLoginCode(cleanEmail, code.trim());
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
      setError(requestError instanceof Error ? requestError.message : 'Kode verifikasi tidak valid.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setStage('form');
    setCode('');
    setError(null);
    setMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#17251a]/70 p-3 backdrop-blur-sm sm:items-center sm:p-6">
      <section
        aria-labelledby="auth-heading"
        className="relative my-3 w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/60 bg-[#FAF6EC] shadow-[0_30px_100px_rgba(15,35,18,0.35)] sm:my-auto"
      >
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup formulir akun"
            className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-gray-600 shadow-sm transition hover:bg-white hover:text-[#2E6B34] sm:right-4 sm:top-4"
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
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
                <Leaf className="h-6 w-6 text-[#B9E0A9]" />
              </span>
              <div>
                <p className="font-poppins text-sm font-bold tracking-wide">Marsiadapari</p>
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
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2E6B34] text-white">
                <Leaf className="h-5 w-5 text-[#B9E0A9]" />
              </span>
              <div>
                <p className="font-poppins text-sm font-bold text-[#1F2A1F]">Marsiadapari Hijau</p>
                <p className="text-xs text-gray-500">Aksi kecil, dampak agung</p>
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
                <p className="mt-3 text-xs leading-5 text-gray-500">
                  Klik tautan konfirmasi di email untuk menyelesaikan pendaftaran dan masuk ke aplikasi.
                </p>
                {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold text-[#2E6B34] hover:bg-[#EAF3E6]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {portal === 'leader' ? 'Kembali ke portal pemimpin' : 'Kembali ke masuk'}
                </button>
              </div>
            ) : (
              <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
                <div className="mb-7">
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#7A5230]">
                    Selamat datang
                  </p>
                  <h2 id="auth-heading" className="font-poppins text-2xl font-bold text-[#1F2A1F] sm:text-3xl">
                    {stage === 'code'
                      ? 'Verifikasi email'
                      : portal === 'admin'
                      ? 'Masuk admin'
                      : portal === 'leader'
                      ? mode === 'register' ? 'Daftar sebagai pemimpin' : 'Masuk portal pemimpin'
                      : mode === 'register' ? 'Buat akun baru' : 'Masuk ke akun'}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    {stage === 'code'
                      ? `Masukkan kode yang kami kirim ke ${cleanEmail}.`
                      : portal === 'admin'
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
                  <div className="mb-6 grid grid-cols-2 rounded-2xl bg-[#EDE9DC] p-1">
                    <button
                      type="button"
                      aria-pressed={mode === 'register'}
                      onClick={() => switchMode('register')}
                      className={`min-h-11 rounded-xl text-sm font-bold transition ${
                        mode === 'register'
                          ? 'bg-white text-[#2E6B34] shadow-sm'
                          : 'text-gray-500 hover:text-[#1F2A1F]'
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
                          ? 'bg-white text-[#2E6B34] shadow-sm'
                          : 'text-gray-500 hover:text-[#1F2A1F]'
                      }`}
                    >
                      {portal === 'leader' ? 'Masuk Pemimpin' : 'Masuk'}
                    </button>
                  </div>
                )}

                {stage === 'code' ? (
                  <form onSubmit={handleVerifyCode} className="space-y-5">
                    {message && (
                      <p role="status" className="rounded-xl border border-[#CEE2C6] bg-[#EDF6E9] p-3 text-sm text-[#2E6B34]">
                        {message}
                      </p>
                    )}
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-[#354235]">Kode verifikasi</span>
                      <input
                        autoFocus
                        required
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        value={code}
                        onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        className="min-h-14 w-full rounded-xl border border-[#D8D7CA] bg-white px-4 text-center font-mono text-2xl tracking-[0.45em] text-[#1F2A1F] outline-none transition focus:border-[#2E6B34] focus:ring-4 focus:ring-[#2E6B34]/10"
                      />
                    </label>
                    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
                    <button
                      type="submit"
                      disabled={isLoading || code.length !== 6}
                      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2E6B34] px-4 text-sm font-bold text-white shadow-lg shadow-[#2E6B34]/20 transition hover:bg-[#24582B] disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      {isLoading && <LoaderCircle className="h-4 w-4 animate-spin" />}
                      Verifikasi dan masuk
                    </button>
                    <div className="flex items-center justify-between">
                      <button type="button" onClick={handleBack} className="min-h-11 text-sm font-semibold text-gray-500 hover:text-[#2E6B34]">
                        Ganti email
                      </button>
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => {
                          setError(null);
                          setIsLoading(true);
                          AuthService.sendLoginCode(cleanEmail)
                            .then(() => setMessage(`Kode baru telah dikirim ke ${cleanEmail}.`))
                            .catch((requestError: unknown) => setError(
                              requestError instanceof Error ? requestError.message : 'Kode verifikasi gagal dikirim.',
                            ))
                            .finally(() => setIsLoading(false));
                        }}
                        className="min-h-11 text-sm font-semibold text-[#2E6B34] hover:underline disabled:opacity-50"
                      >
                        Kirim ulang kode
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={mode === 'register' ? handleRegister : handleRequestCode} className="space-y-4">
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
                        : portal === 'admin' ? 'Kirim kode masuk ke email' : 'Kirim kode verifikasi ke email'}
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
                )}

                <div className="mt-auto flex items-center justify-center gap-2 pt-6 text-[11px] text-gray-400">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Verifikasi email · Akun aman · Komunitas bertumbuh
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
