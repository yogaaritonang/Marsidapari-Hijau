import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  MapPin,
  Plus,
  X,
  Phone,
  Navigation,
  LocateFixed,
  LoaderCircle,
} from 'lucide-react';
import { MapMarkerLocation, User } from '../types';
import { StorageService } from '../services/storageService';
import { SharedDataService } from '../services/sharedDataService';

interface MapPageProps {
  user: User;
  isGuest: boolean;
  onRequireAuth: () => void;
}

export const MapPage: React.FC<MapPageProps> = ({ user, isGuest, onRequireAuth }) => {
  const [locations, setLocations] = useState<MapMarkerLocation[]>(StorageService.getMapLocations());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<MapMarkerLocation | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states for adding new location
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'bank_sampah' | 'tanam_pohon' | 'bersih_danau' | 'mata_air'>('bank_sampah');
  const [newAddress, setNewAddress] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newContact, setNewContact] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [gettingGps, setGettingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  const visibleLocations = locations.filter((location) => {
    if (!location.approvalStatus || location.approvalStatus === 'approved') return true;
    if (location.approvalStatus !== 'pending' || isGuest) return false;
    return user.role === 'admin' || user.role === 'pemimpin' || location.submittedBy === user.id;
  });
  const filtered = visibleLocations.filter((loc) => {
    if (selectedCategory === 'all') return true;
    return loc.category === selectedCategory;
  });

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const latest = await SharedDataService.refreshMapLocations();
        if (active) setLocations(latest);
      } catch (error) {
        console.error('Titik peta bersama gagal dimuat.', error);
      }
    };
    const handleLocalLocations = (event: Event) => {
      const detail = (event as CustomEvent<{ collection: string; values: MapMarkerLocation[] }>).detail;
      if (detail?.collection === 'locations' && Array.isArray(detail.values)) setLocations(detail.values);
    };

    void refresh();
    const intervalId = window.setInterval(() => void refresh(), 30_000);
    window.addEventListener('mh-shared-data-change', handleLocalLocations);
    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener('mh-shared-data-change', handleLocalLocations);
    };
  }, [user.id, isGuest]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Center around Tarutung / North Tapanuli
      const map = L.map(mapContainerRef.current, {
        center: [2.0235, 98.9668],
        zoom: 12,
        zoomControl: false,
      });

      L.control.zoom({ position: 'topright' }).addTo(map);

      // OpenStreetMap Free Tile Layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Add markers for filtered locations
    filtered.forEach((loc) => {
      const getEmoji = (cat: string) => {
        if (cat === 'bank_sampah') return '♻️';
        if (cat === 'tanam_pohon') return '🌱';
        if (cat === 'bersih_danau') return '🌊';
        return '💧';
      };

      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `<div style="
          background-color: #2E6B34;
          color: white;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          font-size: 16px;
        ">${getEmoji(loc.category)}</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
      });

      const marker = L.marker(loc.coordinates, { icon: customIcon }).addTo(map);

      marker.on('click', () => {
        setSelectedLocation(loc);
        map.setView(loc.coordinates, 14, { animate: true });
      });

      markersRef.current.push(marker);
    });
  }, [filtered]);

  const handleAddNewLocation = () => {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (
      !newTitle.trim() ||
      !newAddress.trim() ||
      !latitude.trim() ||
      !longitude.trim() ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) return;

    const newLoc: MapMarkerLocation = {
      id: `loc-${crypto.randomUUID()}`,
      title: newTitle.trim(),
      category: newCategory,
      description: newDesc.trim() || 'Lokasi usulan jemaat untuk kegiatan gotong royong hijau.',
      coordinates: [lat, lng],
      address: newAddress.trim(),
      contactPerson: newContact.trim() || undefined,
      approvalStatus: user.role === 'admin' ? 'approved' : 'pending',
      submittedBy: user.id,
    };

    StorageService.addMapLocation(newLoc);
    const updated = StorageService.getMapLocations();
    setLocations(updated);
    setSelectedLocation(newLoc);
    setShowAddModal(false);

    // Reset form
    setNewTitle('');
    setNewAddress('');
    setNewDesc('');
    setNewContact('');
    setLatitude('');
    setLongitude('');
    setGpsError(null);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(newLoc.coordinates, 14, { animate: true });
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Browser ini tidak mendukung akses GPS.');
      return;
    }
    setGettingGps(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLatitude(coords.latitude.toFixed(6));
        setLongitude(coords.longitude.toFixed(6));
        setGettingGps(false);
      },
      (error) => {
        setGpsError(
          error.code === error.PERMISSION_DENIED
            ? 'Izin lokasi ditolak. Aktifkan izin lokasi pada browser lalu coba lagi.'
            : error.code === error.TIMEOUT
            ? 'GPS belum mendapat lokasi. Coba lagi di area terbuka.'
            : 'Lokasi tidak tersedia. Periksa izin GPS dan coba lagi.',
        );
        setGettingGps(false);
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 },
    );
  };

  return (
    <div className="space-y-4 pb-24 pt-2 px-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-[#7A5230] uppercase tracking-wider">
            Danau Toba &amp; Tarutung
          </span>
          <h2 className="text-lg font-bold font-poppins text-[#1F2A1F]">
            Peta Aksi Hijau
          </h2>
        </div>

        <button
          onClick={() => {
            if (isGuest) {
              onRequireAuth();
              return;
            }
            setShowAddModal(true);
          }}
          className="touch-target inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2E6B34] text-white text-xs font-bold hover:bg-[#235328] transition active:scale-95 shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{user.role === 'admin' ? 'Tambah Lokasi' : 'Usulkan Bank Sampah'}</span>
        </button>
      </div>

      {/* Filter Chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'all', label: 'Semua Titik' },
          { id: 'bank_sampah', label: '♻️ Bank Sampah' },
          { id: 'tanam_pohon', label: '🌱 Tanam Pohon' },
          { id: 'bersih_danau', label: '🌊 Bersih Danau/Sungai' },
          { id: 'mata_air', label: '💧 Mata Air Bersih' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setSelectedCategory(f.id)}
            className={`touch-target shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
              selectedCategory === f.id
                ? 'bg-[#2E6B34] text-white shadow-xs'
                : 'bg-white border border-gray-200 text-gray-700 hover:border-[#2E6B34]/30'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Map Container */}
      <div className="relative rounded-3xl overflow-hidden border-2 border-[#2E6B34]/25 shadow-sm h-72 w-full bg-emerald-50">
        <div ref={mapContainerRef} className="w-full h-full" />
      </div>

      {/* Selected Location Card */}
      {selectedLocation && (
        <div className="p-4 rounded-3xl bg-white border border-[#2E6B34]/30 shadow-xs space-y-2 animate-in fade-in">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold text-[#7A5230] uppercase tracking-wider block">
                {selectedLocation.category.replaceAll('_', ' ')}
              </span>
              {selectedLocation.approvalStatus === 'pending' && (
                <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                  Menunggu persetujuan
                </span>
              )}
              <h3 className="text-sm font-bold text-[#1F2A1F]">
                {selectedLocation.title}
              </h3>
            </div>
            <button
              onClick={() => setSelectedLocation(null)}
              className="p-1 text-gray-400 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-gray-700 leading-relaxed">
            {selectedLocation.description}
          </p>

          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-600">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#2E6B34]" />
              {selectedLocation.address}
            </span>
            {selectedLocation.contactPerson && (
              <span className="flex items-center gap-1 text-[#7A5230] font-medium">
                <Phone className="w-3 h-3" />
                {selectedLocation.contactPerson}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Location Directory List */}
      <div className="space-y-2 pt-1">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#7A5230] font-poppins">
          Daftar Titik Penting ({filtered.length})
        </h3>
        <div className="space-y-2">
          {filtered.map((loc) => (
            <div
              key={loc.id}
              onClick={() => {
                setSelectedLocation(loc);
                if (mapInstanceRef.current) {
                  mapInstanceRef.current.setView(loc.coordinates, 14, { animate: true });
                }
              }}
              className="cursor-pointer p-3 rounded-2xl bg-white border border-gray-200 hover:border-[#2E6B34]/40 shadow-xs flex items-center justify-between gap-3 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#A8D5A2]/30 text-[#2E6B34] flex items-center justify-center font-bold text-base shrink-0">
                  {loc.category === 'bank_sampah'
                    ? '♻️'
                    : loc.category === 'tanam_pohon'
                    ? '🌱'
                    : loc.category === 'bersih_danau'
                    ? '🌊'
                    : '💧'}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900 leading-tight">
                    {loc.title}
                  </h4>
                  <p className="text-[10px] text-gray-500 mt-0.5 truncate max-w-[200px]">
                    {loc.address}
                  </p>
                  {loc.approvalStatus === 'pending' && (
                    <span className="mt-1 inline-block text-[9px] font-bold text-amber-700">Menunggu persetujuan</span>
                  )}
                </div>
              </div>

              <span className="text-[11px] font-bold text-[#2E6B34] flex items-center gap-0.5 shrink-0">
                <span>Lihat</span>
                <Navigation className="w-3 h-3" />
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Tambah Lokasi Usulan */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm max-h-[92vh] overflow-y-auto rounded-3xl bg-[#FAF6EC] border border-[#2E6B34]/25 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="text-sm font-bold font-poppins text-[#2E6B34]">
                {user.role === 'admin' ? 'Tambah Titik Lokasi' : 'Usulkan Titik Bank Sampah'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {user.role !== 'admin' && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-900">
                Usulan akan diperiksa admin atau pemimpin sebelum ditampilkan kepada semua pengguna.
              </p>
            )}

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Nama Tempat / Titik *
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="misal: Bank Sampah Gereja GKPI Tarutung"
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-[#1F2A1F] focus:border-[#2E6B34] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Kategori Titik *
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  disabled={user.role !== 'admin'}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-[#1F2A1F] focus:border-[#2E6B34] focus:outline-hidden"
                >
                  <option value="bank_sampah">♻️ Bank Sampah</option>
                  {user.role === 'admin' && (
                    <>
                      <option value="tanam_pohon">🌱 Lokasi Tanam Pohon</option>
                      <option value="bersih_danau">🌊 Titik Bersih Danau / Sungai</option>
                      <option value="mata_air">💧 Mata Air Bersih</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Alamat / Patokan Lokasi *
                </label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="misal: Jl. Sisingamangaraja, Silindung"
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-[#1F2A1F] focus:border-[#2E6B34] focus:outline-hidden"
                />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className="block font-bold text-gray-700">Koordinat titik *</label>
                  <button
                    type="button"
                    onClick={useCurrentLocation}
                    disabled={gettingGps}
                    className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[#2E6B34]/25 bg-[#F3F7EF] px-2.5 text-[11px] font-bold text-[#2E6B34] hover:bg-[#E9F1E5] disabled:opacity-60"
                  >
                    {gettingGps ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />}
                    {gettingGps ? 'Mencari GPS...' : 'Gunakan GPS'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    aria-label="Lintang"
                    type="number"
                    min="-90"
                    max="90"
                    step="any"
                    value={latitude}
                    onChange={(event) => setLatitude(event.target.value)}
                    placeholder="Lintang"
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-[#1F2A1F] focus:border-[#2E6B34] focus:outline-hidden"
                  />
                  <input
                    aria-label="Bujur"
                    type="number"
                    min="-180"
                    max="180"
                    step="any"
                    value={longitude}
                    onChange={(event) => setLongitude(event.target.value)}
                    placeholder="Bujur"
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-[#1F2A1F] focus:border-[#2E6B34] focus:outline-hidden"
                  />
                </div>
                {gpsError && <p role="alert" className="mt-1 text-[10px] text-red-700">{gpsError}</p>}
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Deskripsi / Keterangan Fasilitas
                </label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Keterangan jenis sampah yang diterima atau jadwal gotong royong..."
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-[#1F2A1F] focus:border-[#2E6B34] focus:outline-hidden resize-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Kontak Narahubung (Opsional)
                </label>
                <input
                  type="text"
                  value={newContact}
                  onChange={(e) => setNewContact(e.target.value)}
                  placeholder="misal: Pak Majelis (0812-xxxx)"
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-[#1F2A1F] focus:border-[#2E6B34] focus:outline-hidden"
                />
                <p className="mt-1 text-[10px] text-gray-500">Kontak akan terlihat oleh semua pengguna setelah titik disetujui.</p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-2 text-xs font-semibold text-gray-600"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={
                  !newTitle.trim() ||
                  !newAddress.trim() ||
                  !latitude.trim() ||
                  !longitude.trim() ||
                  !Number.isFinite(Number(latitude)) ||
                  !Number.isFinite(Number(longitude)) ||
                  Number(latitude) < -90 ||
                  Number(latitude) > 90 ||
                  Number(longitude) < -180 ||
                  Number(longitude) > 180
                }
                onClick={handleAddNewLocation}
                className="flex-1 py-2.5 rounded-xl bg-[#2E6B34] text-white text-xs font-bold hover:bg-[#235328] disabled:opacity-50 transition active:scale-95 shadow-md"
              >
                {user.role === 'admin' ? 'Simpan & tampilkan' : 'Kirim usulan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
