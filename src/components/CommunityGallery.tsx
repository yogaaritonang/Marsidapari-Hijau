import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Camera, Check, ChevronLeft, ChevronRight, LoaderCircle, RefreshCw, Trash2, X } from 'lucide-react';
import { User } from '../types';
import { AuthService } from '../services/authService';
import { compressImage } from '../services/imageCompression';
import { fetchRecentPublicProfilePhotos } from '../services/profilePhotoService';

interface GalleryPhoto {
  path: string;
  url: string;
  ownerId: string | null;
  ownerName: string;
  createdAt: string | null;
}

interface StorageObject {
  name: string;
  created_at?: string;
  metadata?: {
    ownerId?: string;
    ownerName?: string;
  } | null;
}

interface CommunityGalleryProps {
  user: User;
  isGuest: boolean;
  onRequireAuth: () => void;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/+$/, '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const bucketName = 'community-gallery';
const maximumUploadBytes = 10 * 1024 * 1024;

function encodeObjectPath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

function toGalleryPhoto(entry: StorageObject, communityId: string): GalleryPhoto {
  const path = entry.name.startsWith(`${communityId}/`)
    ? entry.name
    : `${communityId}/${entry.name}`;
  const ownerId = entry.metadata?.ownerId || entry.name.split('/').pop()?.split('--')[0] || null;
  return {
    path,
    url: `${supabaseUrl}/storage/v1/object/public/${bucketName}/${encodeObjectPath(path)}`,
    ownerId,
    ownerName: entry.metadata?.ownerName || 'Anggota komunitas',
    createdAt: entry.created_at || null,
  };
}

export const CommunityGallery: React.FC<CommunityGalleryProps> = ({
  user,
  isGuest,
  onRequireAuth,
}) => {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [profilePhotos, setProfilePhotos] = useState<Array<{ userId: string; url: string }>>([]);
  const [profileGalleryError, setProfileGalleryError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const communityId = user.communityId || 'umum';

  const loadPhotos = useCallback(async () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      setLoading(false);
      setErrorMessage('Galeri belum dikonfigurasi. Admin perlu mengatur Supabase dan menjalankan migration galeri.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`${supabaseUrl}/storage/v1/object/list/${bucketName}`, {
        method: 'POST',
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prefix: `${communityId}/`,
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' },
        }),
      });
      if (!response.ok) {
        const details = await response.text();
        throw new Error(details || `Galeri gagal dimuat (HTTP ${response.status}).`);
      }

      const entries = await response.json() as StorageObject[];
      setPhotos(entries
        .filter((entry) => typeof entry.name === 'string' && /\.(jpe?g|png|webp)$/i.test(entry.name))
        .map((entry) => toGalleryPhoto(entry, communityId)));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Galeri gagal dimuat. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  useEffect(() => {
    void loadPhotos();
  }, [loadPhotos]);

  useEffect(() => {
    let active = true;
    void fetchRecentPublicProfilePhotos()
      .then((photos) => {
        if (active) setProfilePhotos(photos);
      })
      .catch((error: unknown) => {
        if (active) {
          setProfileGalleryError(
            error instanceof Error ? error.message : 'Galeri foto profil gagal dimuat.',
          );
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (isGuest) {
      onRequireAuth();
      return;
    }
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Pilih berkas foto dengan format gambar.');
      return;
    }
    if (file.size > maximumUploadBytes) {
      setErrorMessage('Ukuran foto maksimal 10 MB sebelum dikompres.');
      return;
    }
    if (!supabaseUrl || !supabaseAnonKey) {
      setErrorMessage('Galeri belum dikonfigurasi. Silakan hubungi pengelola.');
      return;
    }

    setUploading(true);
    setErrorMessage(null);
    try {
      const token = await AuthService.getAccessToken();
      if (!token) {
        onRequireAuth();
        return;
      }

      const { dataUrl } = await compressImage(file, 1200, 1200, 0.78);
      const imageBlob = await (await fetch(dataUrl)).blob();
      if (imageBlob.size > 5 * 1024 * 1024) {
        throw new Error('Foto tetap terlalu besar setelah dikompres. Coba pilih foto lain.');
      }

      const filename = `${user.id}--${crypto.randomUUID()}.jpg`;
      const objectPath = `${communityId}/${filename}`;
      const response = await fetch(
        `${supabaseUrl}/storage/v1/object/${bucketName}/${encodeObjectPath(objectPath)}`,
        {
          method: 'POST',
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${token}`,
            'Content-Type': 'image/jpeg',
            'Cache-Control': '3600',
            'x-upsert': 'false',
            'x-metadata': JSON.stringify({
              ownerId: user.id,
              ownerName: user.preferences.isAnonymous ? 'Sahabat Ciptaan' : user.name,
            }),
          },
          body: imageBlob,
        },
      );
      if (!response.ok) {
        const details = await response.text();
        throw new Error(details || `Foto gagal diunggah (HTTP ${response.status}).`);
      }

      await loadPhotos();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Foto gagal diunggah. Silakan coba lagi.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (selectedPhotoIndex === null) return;
    const photo = photos[selectedPhotoIndex];
    if (!photo || photo.ownerId !== user.id) return;
    setDeleting(true);
    setErrorMessage(null);
    try {
      const token = await AuthService.getAccessToken();
      if (!token) {
        onRequireAuth();
        return;
      }
      const response = await fetch(
        `${supabaseUrl}/storage/v1/object/${bucketName}/${encodeObjectPath(photo.path)}`,
        {
          method: 'DELETE',
          headers: {
            apikey: supabaseAnonKey!,
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (!response.ok) {
        const details = await response.text();
        throw new Error(details || `Foto gagal dihapus (HTTP ${response.status}).`);
      }
      setSelectedPhotoIndex(null);
      await loadPhotos();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Foto gagal dihapus. Silakan coba lagi.');
    } finally {
      setDeleting(false);
    }
  };

  const selectedPhoto = selectedPhotoIndex === null ? null : photos[selectedPhotoIndex];

  const showPreviousPhoto = () => {
    if (selectedPhotoIndex === null || photos.length === 0) return;
    setSelectedPhotoIndex((selectedPhotoIndex + photos.length - 1) % photos.length);
  };

  const showNextPhoto = () => {
    if (selectedPhotoIndex === null || photos.length === 0) return;
    setSelectedPhotoIndex((selectedPhotoIndex + 1) % photos.length);
  };

  return (
    <section className="space-y-4" aria-labelledby="community-gallery-title">
      <div className="space-y-3 rounded-3xl border border-[#2E6B34]/20 bg-white p-4 shadow-xs">
        <div>
          <h4 className="text-sm font-bold font-poppins text-[#1F2A1F]">Foto Profil Anggota</h4>
          <p className="mt-1 text-[11px] text-gray-500">
            Foto profil publik yang dibagikan anggota Marsiadapari Hijau.
          </p>
        </div>
        {profileGalleryError ? (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            {profileGalleryError}
          </p>
        ) : profilePhotos.filter((p) => p.url && p.url.trim()).length > 0 ? (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
            {profilePhotos
              .filter((photo) => photo.url && photo.url.trim())
              .map((photo) => (
                <img
                  key={photo.userId}
                  src={photo.url}
                  alt="Foto profil publik anggota"
                  title="Foto profil anggota"
                  loading="lazy"
                  className="aspect-square w-full rounded-full border border-[#2E6B34]/15 bg-[#FAF6EC] object-cover"
                />
              ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-xs text-gray-500">
            Belum ada foto profil yang dibagikan.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 id="community-gallery-title" className="text-sm font-bold font-poppins text-[#1F2A1F]">
            Galeri Komunitas
          </h3>
          <p className="mt-1 text-[11px] text-gray-500">
            Foto aksi gotong royong nyata untuk komunitas ini.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadPhotos()}
            disabled={loading || uploading}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Muat ulang
          </button>
          <button
            type="button"
            onClick={() => isGuest ? onRequireAuth() : fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#2E6B34] px-3 text-xs font-bold text-white hover:bg-[#235328] disabled:opacity-60"
          >
            {uploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            {uploading ? 'Mengunggah...' : isGuest ? 'Masuk untuk mengunggah' : 'Unggah foto'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(event) => void handleUpload(event)}
            className="hidden"
          />
        </div>
      </div>

      <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] leading-relaxed text-amber-900">
        Foto galeri dapat dilihat oleh siapa pun yang membuka galeri komunitas ini. Unggah hanya foto aksi yang Anda izinkan untuk dibagikan dan hindari menampilkan wajah tanpa izin.
      </p>

      {errorMessage && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {loading ? (
        <div role="status" className="flex items-center justify-center gap-2 rounded-2xl bg-white p-8 text-xs font-semibold text-gray-500">
          <LoaderCircle className="h-4 w-4 animate-spin text-[#2E6B34]" />
          Memuat galeri...
        </div>
      ) : photos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#2E6B34]/25 bg-white p-8 text-center">
          <Camera className="mx-auto h-8 w-8 text-[#2E6B34]/50" />
          <p className="mt-2 text-sm font-bold text-[#1F2A1F]">Belum ada foto aksi</p>
          <p className="mt-1 text-xs text-gray-500">Jadilah yang pertama membagikan aksi gotong royong komunitas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {photos
            .filter((photo) => photo.url && photo.url.trim())
            .map((photo, index) => (
            <button
              type="button"
              key={photo.path}
              onClick={() => setSelectedPhotoIndex(index)}
              className="group relative aspect-square overflow-hidden rounded-2xl bg-gray-100 text-left focus:outline-none focus:ring-2 focus:ring-[#2E6B34] focus:ring-offset-2"
              aria-label={`Lihat foto aksi oleh ${photo.ownerName}`}
            >
              <img src={photo.url} alt={`Aksi gotong royong oleh ${photo.ownerName}`} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-2 pb-2 pt-6 text-left text-[10px] font-semibold text-white">
                {photo.ownerName}
              </span>
            </button>
          ))}
        </div>
      )}

      {selectedPhoto && selectedPhotoIndex !== null && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Foto galeri komunitas"
          onClick={() => setSelectedPhotoIndex(null)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setSelectedPhotoIndex(null);
            if (event.key === 'ArrowLeft') showPreviousPhoto();
            if (event.key === 'ArrowRight') showNextPhoto();
          }}
        >
          <div className="relative flex max-h-full max-w-5xl flex-col items-center gap-3" onClick={(event) => event.stopPropagation()}>
            <div className="flex w-full items-center justify-between text-xs font-semibold text-white">
              <span>{selectedPhoto.ownerName}{selectedPhoto.createdAt ? ` · ${new Date(selectedPhoto.createdAt).toLocaleDateString('id-ID')}` : ''}</span>
              <div className="flex items-center gap-2">
                {!isGuest && selectedPhoto.ownerId === user.id && (
                  <button
                    type="button"
                    onClick={() => void handleDelete()}
                    disabled={deleting}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-red-600 px-3 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    {deleting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Hapus foto
                  </button>
                )}
                <button type="button" onClick={() => setSelectedPhotoIndex(null)} className="rounded-full bg-white/15 p-2 text-white hover:bg-white/25" aria-label="Tutup foto">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="relative flex max-h-[78vh] max-w-full items-center">
              {photos.length > 1 && (
                <button type="button" onClick={showPreviousPhoto} className="absolute left-2 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70" aria-label="Foto sebelumnya">
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              {selectedPhoto.url && selectedPhoto.url.trim() ? (
                <img src={selectedPhoto.url} alt={`Aksi gotong royong oleh ${selectedPhoto.ownerName}`} className="max-h-[78vh] max-w-full rounded-xl object-contain" />
              ) : null}
              {photos.length > 1 && (
                <button type="button" onClick={showNextPhoto} className="absolute right-2 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70" aria-label="Foto berikutnya">
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-white/75">
              <Check className="h-3 w-3" />
              {selectedPhotoIndex + 1} / {photos.length}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
