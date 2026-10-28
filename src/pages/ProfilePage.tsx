import React, { useEffect, useState } from 'react';
import {
  Type,
  Wifi,
  Bell,
  EyeOff,
  Download,
  Trash2,
  Info,
  CheckCircle2,
  X,
  ExternalLink,
  LockKeyhole,
  Camera,
  LoaderCircle,
} from 'lucide-react';
import { User } from '../types';
import { StorageService } from '../services/storageService';
import { POINT_BADGES } from '../data/badges';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { fetchProfilePhotoUrls, removeProfilePhoto, uploadProfilePhoto } from '../services/profilePhotoService';

interface ProfilePageProps {
  user: User;
  onUpdateUser: (user: User) => void;
  onLogout: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  user,
  onUpdateUser,
  onLogout,
}) => {
  const [preferences, setPreferences] = useState(user.preferences);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [newBadges, setNewBadges] = useState<typeof POINT_BADGES>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [hasProfilePhoto, setHasProfilePhoto] = useState(false);
  const [photoRefreshKey, setPhotoRefreshKey] = useState(0);
  const photoInputRef = React.useRef<HTMLInputElement>(null);
  const earnedBadges = POINT_BADGES.filter((badge) => user.points >= badge.requiredPoints);
  const nextBadge = POINT_BADGES.find((badge) => user.points < badge.requiredPoints);
  const previousBadgePoints = nextBadge
    ? POINT_BADGES[POINT_BADGES.indexOf(nextBadge) - 1]?.requiredPoints ?? 0
    : POINT_BADGES[POINT_BADGES.length - 1].requiredPoints;
  const nextBadgeProgress = nextBadge
    ? Math.min(
        100,
        Math.round(
          ((user.points - previousBadgePoints) /
            (nextBadge.requiredPoints - previousBadgePoints)) *
            100,
        ),
      )
    : 100;

  useEffect(() => {
    const newlyUnlockedIds = StorageService.consumePendingBadgeUnlocks(user.id);
    if (newlyUnlockedIds.length === 0) return;

    const unlocked = POINT_BADGES.filter((badge) => newlyUnlockedIds.includes(badge.id));
    if (unlocked.length === 0) return;
    setNewBadges(unlocked);

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      void import('canvas-confetti')
        .then(({ default: confetti }) => {
          confetti({
            particleCount: 90,
            spread: 75,
            startVelocity: 38,
            origin: { y: 0.62 },
            colors: ['#2E6B34', '#A8D5A2', '#F3C969', '#3B8EA5'],
            disableForReducedMotion: true,
          });
          window.setTimeout(() => {
            confetti({
              particleCount: 45,
              spread: 110,
              startVelocity: 28,
              origin: { x: 0.78, y: 0.68 },
              colors: ['#2E6B34', '#A8D5A2', '#F3C969', '#3B8EA5'],
              disableForReducedMotion: true,
            });
          }, 220);
        })
        .catch((error: unknown) => {
          console.warn('Confetti animation could not start', error);
        });
    }
  }, [user.id, user.points]);

  useEffect(() => {
    let active = true;
    void fetchProfilePhotoUrls([user.id])
      .then((photos) => {
        if (active) setHasProfilePhoto(Boolean(photos[user.id]));
      })
      .catch((error: unknown) => {
        if (active) setPhotoError(error instanceof Error ? error.message : 'Foto profil gagal dimuat.');
      });
    return () => {
      active = false;
    };
  }, [user.id, photoRefreshKey]);

  const handleTogglePref = (key: keyof typeof preferences) => {
    const updatedPrefs = {
      ...preferences,
      [key]: !preferences[key],
    };
    setPreferences(updatedPrefs);
    const updatedUser = StorageService.updateUser({ preferences: updatedPrefs });
    onUpdateUser(updatedUser);
    showNotice('Pengaturan berhasil disimpan');
  };

  const handleFontSizeChange = (size: 'normal' | 'besar') => {
    const updatedPrefs = { ...preferences, fontSize: size };
    setPreferences(updatedPrefs);
    const updatedUser = StorageService.updateUser({ preferences: updatedPrefs });
    onUpdateUser(updatedUser);
    showNotice(`Ukuran huruf diubah ke ${size}`);
  };

  const showNotice = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleExportData = () => {
    const dataStr = StorageService.exportUserData();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marsiadapari-data-${user.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    showNotice('Data berhasil diekspor!');
  };

  const handleResetData = () => {
    if (confirm('Apakah Anda yakin ingin menghapus data lokal dan keluar?')) {
      StorageService.resetAllData();
      onLogout();
    }
  };

  const handleProfilePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setPhotoBusy(true);
    setPhotoError(null);
    try {
      await uploadProfilePhoto(file, user.id);
      setHasProfilePhoto(true);
      setPhotoRefreshKey((key) => key + 1);
      showNotice('Foto profil berhasil diperbarui dan dapat dilihat pengguna lain.');
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : 'Foto profil gagal diunggah.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleRemoveProfilePhoto = async () => {
    setPhotoBusy(true);
    setPhotoError(null);
    try {
      await removeProfilePhoto(user.id);
      setHasProfilePhoto(false);
      setPhotoRefreshKey((key) => key + 1);
      showNotice('Foto profil berhasil dihapus.');
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : 'Foto profil gagal dihapus.');
    } finally {
      setPhotoBusy(false);
    }
  };

  return (
    <div className="space-y-4 pb-24 pt-2 px-4">
      {/* Header */}
      <div>
        <span className="text-xs font-bold text-[#7A5230] uppercase tracking-wider">
          Akun &amp; Preferensi
        </span>
        <h2 className="text-lg font-bold font-poppins text-[#1F2A1F]">
          Profil &amp; Pengaturan
        </h2>
      </div>

      {toast && (
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-300 text-xs font-semibold text-center animate-in fade-in">
          {toast}
        </div>
      )}

      {newBadges.length > 0 && (
        <div
          role="status"
          aria-live="polite"
          className="relative overflow-hidden rounded-3xl border border-emerald-300 bg-gradient-to-r from-emerald-50 via-white to-amber-50 p-4 shadow-sm animate-in zoom-in-95 duration-500"
        >
          <button
            type="button"
            onClick={() => setNewBadges([])}
            className="absolute right-3 top-3 rounded-full p-1 text-gray-500 hover:bg-white"
            aria-label="Tutup ucapan lencana baru"
          >
            <X className="h-4 w-4" />
          </button>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#2E6B34]">
            Lencana baru terbuka!
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {newBadges.map((badge) => (
              <span key={badge.id} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-emerald-900 shadow-sm">
                <span aria-hidden="true">{badge.icon}</span>
                {badge.title}
              </span>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-gray-600">Terima kasih atas aksi nyata menjaga lingkungan!</p>
        </div>
      )}

      {/* User Identity Card */}
      <div className="rounded-3xl bg-white border border-[#2E6B34]/25 p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-3">
          <ProfileAvatar
            userId={user.id}
            name={user.name}
            refreshKey={photoRefreshKey}
            className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[#2E6B34] to-[#1F4B23] text-xl font-bold text-white shadow-md"
          />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold font-poppins text-[#1F2A1F]">
                {user.name}
              </h3>
              <span
                className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                  user.role === 'pemimpin'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {user.role === 'pemimpin' ? 'Pemimpin' : 'Anggota'}
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-0.5">{user.communityName}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Kontak: {user.contact}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-3">
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            disabled={photoBusy}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#2E6B34] px-3 text-xs font-bold text-white hover:bg-[#235328] disabled:opacity-60"
          >
            {photoBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            {photoBusy ? 'Memproses foto...' : hasProfilePhoto ? 'Ganti foto profil' : 'Unggah foto profil'}
          </button>
          {hasProfilePhoto && (
            <button
              type="button"
              onClick={() => void handleRemoveProfilePhoto()}
              disabled={photoBusy}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
              Hapus foto
            </button>
          )}
          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => void handleProfilePhotoChange(event)}
            className="hidden"
          />
        </div>
        <p className="text-[10px] leading-relaxed text-gray-500">
          Foto profil disimpan publik agar dapat dilihat pengguna lain. Maksimal 10 MB sebelum kompresi.
        </p>
        {photoError && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-800">
            {photoError}
          </p>
        )}
      </div>

      <section
        aria-labelledby="profile-badges-title"
        className="rounded-3xl bg-white border border-[#2E6B34]/25 p-5 shadow-xs space-y-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 id="profile-badges-title" className="text-sm font-bold font-poppins text-[#1F2A1F]">
              Lencana Poin Hijau
            </h3>
            <p className="mt-1 text-[11px] text-gray-500">
              Lencana terbuka otomatis saat poin aksi terverifikasi mencapai target.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-[#A8D5A2]/30 px-2.5 py-1 text-[10px] font-extrabold text-[#2E6B34]">
            {earnedBadges.length}/{POINT_BADGES.length} terbuka
          </span>
        </div>

        {nextBadge ? (
          <div className="rounded-2xl border border-[#2E6B34]/15 bg-[#FAF6EC] p-3">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="font-bold text-gray-800">
                {user.points} / {nextBadge.requiredPoints} poin menuju {nextBadge.title}
              </span>
              <span className="shrink-0 font-semibold text-[#2E6B34]">{nextBadgeProgress}%</span>
            </div>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-white"
              role="progressbar"
              aria-label={`Progres menuju lencana ${nextBadge.title}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={nextBadgeProgress}
            >
              <div
                className="h-full rounded-full bg-[#2E6B34] transition-all"
                style={{ width: `${nextBadgeProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
            Semua lencana telah terbuka. Terima kasih sudah terus merawat ciptaan!
          </p>
        )}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {POINT_BADGES.map((badge) => {
            const unlocked = user.points >= badge.requiredPoints;
            return (
              <div
                key={badge.id}
                className={`flex items-center gap-3 rounded-2xl border p-3 ${
                  unlocked
                    ? 'border-emerald-200 bg-emerald-50/70'
                    : 'border-gray-200 bg-gray-50'
                }`}
                aria-label={`${badge.title}, ${unlocked ? 'terbuka' : `terkunci, perlu ${badge.requiredPoints} poin`}`}
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl ${
                    unlocked ? 'bg-white' : 'bg-gray-200 grayscale'
                  }`}
                  aria-hidden="true"
                >
                  {unlocked ? badge.icon : <LockKeyhole className="h-5 w-5 text-gray-500" />}
                </span>
                <div className="min-w-0">
                  <p className={`text-xs font-extrabold ${unlocked ? 'text-emerald-900' : 'text-gray-600'}`}>
                    {badge.title}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-gray-500">
                    {unlocked ? 'Lencana terbuka' : `${badge.requiredPoints} Poin Hijau diperlukan`}
                  </p>
                </div>
                {unlocked && (
                  <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-emerald-700" aria-label="Terbuka" />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Preferences Section */}
      <div className="rounded-3xl bg-white border border-gray-200/90 p-4 shadow-xs space-y-3 text-xs">
        <h4 className="font-bold text-[#7A5230] uppercase tracking-wider text-[10px]">
          Pengaturan Tampilan &amp; Notifikasi
        </h4>

        {/* Font size toggle (Normal / Besar) */}
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2 text-gray-800">
            <Type className="w-4 h-4 text-[#2E6B34]" />
            <div>
              <span className="font-bold block">Ukuran Huruf Teks</span>
              <span className="text-[10px] text-gray-500">
                Pilihan huruf besar untuk kemudahan membaca lansia/jemaat
              </span>
            </div>
          </div>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => handleFontSizeChange('normal')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                preferences.fontSize === 'normal'
                  ? 'bg-white text-[#2E6B34] shadow-xs'
                  : 'text-gray-500'
              }`}
            >
              Normal
            </button>
            <button
              onClick={() => handleFontSizeChange('besar')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                preferences.fontSize === 'besar'
                  ? 'bg-white text-[#2E6B34] shadow-xs'
                  : 'text-gray-500'
              }`}
            >
              Besar
            </button>
          </div>
        </div>

        {/* Data Saver Mode */}
        <div className="flex items-center justify-between py-1 border-t border-gray-100">
          <div className="flex items-center gap-2 text-gray-800">
            <Wifi className="w-4 h-4 text-cyan-600" />
            <div>
              <span className="font-bold block">Mode Hemat Kuota Data</span>
              <span className="text-[10px] text-gray-500">
                Mengurangi pemuatan gambar beresolusi tinggi saat sinyal minim
              </span>
            </div>
          </div>
          <input
            type="checkbox"
            checked={preferences.dataSaver}
            onChange={() => handleTogglePref('dataSaver')}
            className="w-4 h-4 rounded text-[#2E6B34] focus:ring-[#2E6B34]"
          />
        </div>

        {/* Daily Devotion Notifications */}
        <div className="flex items-center justify-between py-1 border-t border-gray-100">
          <div className="flex items-center gap-2 text-gray-800">
            <Bell className="w-4 h-4 text-amber-500" />
            <div>
              <span className="font-bold block">Pengingat Renungan Pagi</span>
              <span className="text-[10px] text-gray-500">
                Kabar renungan firman dan tantangan pukul 06.00 WIB
              </span>
            </div>
          </div>
          <input
            type="checkbox"
            checked={preferences.notifications}
            onChange={() => handleTogglePref('notifications')}
            className="w-4 h-4 rounded text-[#2E6B34] focus:ring-[#2E6B34]"
          />
        </div>
      </div>

      {/* Privacy & Data Management */}
      <div className="rounded-3xl bg-white border border-gray-200/90 p-4 shadow-xs space-y-3 text-xs">
        <h4 className="font-bold text-[#7A5230] uppercase tracking-wider text-[10px]">
          Privasi &amp; Data Saya
        </h4>

        {/* Anonymous Leaderboard Toggle */}
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2 text-gray-800">
            <EyeOff className="w-4 h-4 text-[#7A5230]" />
            <div>
              <span className="font-bold block">Tampil Anonim di Papan Capaian</span>
              <span className="text-[10px] text-gray-500">
                Nama disamarkan menjadi "Sahabat Ciptaan (Anonim)"
              </span>
            </div>
          </div>
          <input
            type="checkbox"
            checked={preferences.isAnonymous}
            onChange={() => handleTogglePref('isAnonymous')}
            className="w-4 h-4 rounded text-[#2E6B34] focus:ring-[#2E6B34]"
          />
        </div>

        {/* Privacy Policy Link */}
        <div className="pt-1 border-t border-gray-100">
          <button
            onClick={() => setShowPrivacyPolicy(true)}
            className="w-full py-2 text-left font-semibold text-[#2E6B34] hover:underline flex items-center justify-between"
          >
            <span>Baca Kebijakan Privasi Marsiadapari Hijau</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Export Data */}
        <div className="pt-1 border-t border-gray-100">
          <button
            onClick={handleExportData}
            className="w-full py-2 rounded-xl bg-gray-50 hover:bg-gray-100 border text-gray-800 font-bold transition flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4 text-[#2E6B34]" />
            <span>Ekspor &amp; Unduh Semua Data Saya (JSON)</span>
          </button>
        </div>

        {/* Reset Account */}
        <div className="pt-1 border-t border-gray-100">
          <button
            onClick={handleResetData}
            className="w-full py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold transition flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>Hapus Data Lokal &amp; Keluar</span>
          </button>
        </div>
      </div>

      {/* App Version & Credits */}
      <div className="text-center py-2 text-xs text-gray-400 space-y-1">
        <p className="font-semibold text-gray-600">
          Marsiadapari Hijau v1.0.0 PWA &bull; IAKN Tarutung
        </p>
        <p className="text-[11px]">
          Institut Agama Kristen Negeri Tarutung &bull; Tapanuli Utara
        </p>
      </div>

      {/* Privacy Policy Modal */}
      {showPrivacyPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-[#FAF6EC] border border-[#2E6B34]/25 p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="text-sm font-bold font-poppins text-[#2E6B34] flex items-center gap-1.5">
                <Info className="w-4 h-4" />
                Kebijakan Privasi
              </h3>
              <button
                onClick={() => setShowPrivacyPolicy(false)}
                className="p-1 text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-gray-700 space-y-2 max-h-72 overflow-y-auto">
              <p>
                <strong>1. Data Minimalis:</strong> Kami hanya mengumpulkan informasi dasar (nama, kontak, pilihan komunitas) yang diperlukan untuk partisipasi gotong royong.
              </p>
              <p>
                <strong>2. Penyimpanan Terenkripsi di Sisi Klien:</strong> Data Anda disimpan secara aman di browser/perangkat Anda sendiri menggunakan enkripsi lokal.
              </p>
              <p>
                <strong>3. Pengolahan Bukti AI:</strong> Foto bukti dikompresi di browser Anda sebelum dikirim ke AI Verifikator untuk penilaian. Foto tidak disimpan permanen di server publik.
              </p>
              <p>
                <strong>4. Perlindungan Wajah Orang Lain:</strong> Pengguna dihimbau untuk fokus memotret objek aksi (tumbler, pohon, sampah terpilah) dan tidak menyertakan wajah orang lain tanpa izin.
              </p>
            </div>

            <button
              onClick={() => setShowPrivacyPolicy(false)}
              className="w-full py-2.5 rounded-xl bg-[#2E6B34] text-white text-xs font-bold"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
