import React, { useEffect, useState } from 'react';
import { CheckCircle2, MapPin, XCircle } from 'lucide-react';
import { MapMarkerLocation } from '../types';
import { SharedDataService } from '../services/sharedDataService';
import { StorageService } from '../services/storageService';

export const MapLocationReviewPanel: React.FC = () => {
  const [locations, setLocations] = useState<MapMarkerLocation[]>(StorageService.getMapLocations());

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const latest = await SharedDataService.refreshMapLocations();
        if (active) setLocations(latest);
      } catch (error) {
        console.error('Usulan lokasi bank sampah gagal dimuat.', error);
      }
    };

    void refresh();
    const intervalId = window.setInterval(() => void refresh(), 30_000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const review = (locationId: string, approvalStatus: 'approved' | 'rejected') => {
    const updated = StorageService.getMapLocations().map((location) =>
      location.id === locationId ? { ...location, approvalStatus } : location,
    );
    StorageService.saveMapLocations(updated);
    setLocations(updated);
  };

  const pending = locations.filter((location) => location.approvalStatus === 'pending');

  return (
    <section className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
      <div>
        <h2 className="font-bold">Usulan titik Bank Sampah ({pending.length})</h2>
        <p className="mt-1 text-xs leading-5 text-gray-500">
          Periksa nama, alamat, dan koordinat sebelum menyetujui. Titik yang disetujui akan terlihat di peta publik.
        </p>
      </div>
      {pending.length === 0 ? (
        <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">Belum ada usulan yang menunggu tinjauan.</p>
      ) : pending.map((location) => (
        <article key={location.id} className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#2E6B34]" />
            <div className="min-w-0">
              <h3 className="font-bold">{location.title}</h3>
              <p className="text-xs text-gray-600">{location.address}</p>
              <p className="mt-1 text-[11px] text-gray-500">
                Koordinat: {location.coordinates[0].toFixed(6)}, {location.coordinates[1].toFixed(6)}
              </p>
              {location.description && <p className="mt-1 text-xs text-gray-700">{location.description}</p>}
              {location.contactPerson && <p className="mt-1 text-xs text-gray-600">Kontak: {location.contactPerson}</p>}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => review(location.id, 'rejected')}
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-100 px-3 text-xs font-bold text-red-800 hover:bg-red-200"
            >
              <XCircle className="h-4 w-4" /> Tolak
            </button>
            <button
              type="button"
              onClick={() => review(location.id, 'approved')}
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#2E6B34] px-3 text-xs font-bold text-white hover:bg-[#235328]"
            >
              <CheckCircle2 className="h-4 w-4" /> Setujui &amp; tampilkan
            </button>
          </div>
        </article>
      ))}
    </section>
  );
};
