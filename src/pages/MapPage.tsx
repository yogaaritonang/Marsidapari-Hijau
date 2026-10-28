import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  MapPin,
  Trash2,
  Trees,
  Waves,
  Droplets,
  Plus,
  X,
  Phone,
  Navigation,
} from 'lucide-react';
import { MapMarkerLocation } from '../types';
import { StorageService } from '../services/storageService';

export const MapPage: React.FC = () => {
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

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  const filtered = locations.filter((loc) => {
    if (selectedCategory === 'all') return true;
    return loc.category === selectedCategory;
  });

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
    if (!newTitle.trim() || !newAddress.trim()) return;

    const newLoc: MapMarkerLocation = {
      id: 'loc-' + Date.now(),
      title: newTitle.trim(),
      category: newCategory,
      description: newDesc.trim() || 'Lokasi usulan jemaat untuk kegiatan gotong royong hijau.',
      coordinates: [
        2.0235 + (Math.random() - 0.5) * 0.05,
        98.9668 + (Math.random() - 0.5) * 0.05,
      ],
      address: newAddress.trim(),
      contactPerson: newContact.trim() || undefined,
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

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(newLoc.coordinates, 14, { animate: true });
    }
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
          onClick={() => setShowAddModal(true)}
          className="touch-target inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2E6B34] text-white text-xs font-bold hover:bg-[#235328] transition active:scale-95 shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Lokasi</span>
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
                {selectedLocation.category.replace('_', ' ')}
              </span>
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
          <div className="w-full max-w-sm rounded-3xl bg-[#FAF6EC] border border-[#2E6B34]/25 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="text-sm font-bold font-poppins text-[#2E6B34]">
                Tambah Usulan Titik Hijau
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

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
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-[#1F2A1F] focus:border-[#2E6B34] focus:outline-hidden"
                >
                  <option value="bank_sampah">♻️ Bank Sampah</option>
                  <option value="tanam_pohon">🌱 Lokasi Tanam Pohon</option>
                  <option value="bersih_danau">🌊 Titik Bersih Danau / Sungai</option>
                  <option value="mata_air">💧 Mata Air Bersih</option>
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
                disabled={!newTitle.trim() || !newAddress.trim()}
                onClick={handleAddNewLocation}
                className="flex-1 py-2.5 rounded-xl bg-[#2E6B34] text-white text-xs font-bold hover:bg-[#235328] disabled:opacity-50 transition active:scale-95 shadow-md"
              >
                Simpan Titik di Peta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
