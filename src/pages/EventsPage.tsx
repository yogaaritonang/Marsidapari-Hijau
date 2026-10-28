import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  QrCode,
  Bell,
  X,
  Share2,
} from 'lucide-react';
import { GreenEvent } from '../types';
import { StorageService } from '../services/storageService';

interface EventsPageProps {
  isGuest: boolean;
  onRequireAuth: () => void;
}

export const EventsPage: React.FC<EventsPageProps> = ({ isGuest, onRequireAuth }) => {
  const [events, setEvents] = useState<GreenEvent[]>(StorageService.getEvents());
  const [activeQrEvent, setActiveQrEvent] = useState<GreenEvent | null>(null);
  const [reminderToast, setReminderToast] = useState<string | null>(null);

  const handleToggleRegister = (eventId: string) => {
    if (isGuest) {
      onRequireAuth();
      return;
    }
    StorageService.toggleEventRegistration(eventId);
    setEvents(StorageService.getEvents());
  };

  const handleReminder = (evt: GreenEvent) => {
    setReminderToast(`Pengingat diset untuk "${evt.title}" (${evt.date})`);
    setTimeout(() => setReminderToast(null), 3000);
  };

  return (
    <div className="space-y-4 pb-24 pt-2 px-4">
      {/* Header */}
      <div>
        <span className="text-xs font-bold text-[#7A5230] uppercase tracking-wider">
          Persekutuan &amp; Aksi
        </span>
        <h2 className="text-lg font-bold font-poppins text-[#1F2A1F]">
          Event &amp; Ibadah Hijau
        </h2>
        <p className="text-xs text-gray-600 mt-0.5">
          Jadwal kebaktian Minggu Ciptaan dan gotong royong akbar di Danau Toba
        </p>
      </div>

      {reminderToast && (
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-300 text-xs font-semibold animate-in fade-in text-center">
          🔔 {reminderToast}
        </div>
      )}

      {/* Events List */}
      <div className="space-y-3">
        {events.length === 0 && (
          <div className="rounded-3xl border border-dashed border-[#2E6B34]/25 bg-white p-8 text-center">
            <Calendar className="mx-auto h-8 w-8 text-[#2E6B34]/50" />
            <p className="mt-3 text-sm font-bold text-[#1F2A1F]">Belum ada kegiatan terjadwal</p>
            <p className="mt-1 text-xs text-gray-500">Kegiatan akan muncul di sini setelah ditambahkan oleh pengelola organisasi.</p>
          </div>
        )}
        {events.map((evt) => (
          <div
            key={evt.id}
            className="p-4 rounded-3xl bg-white border border-gray-200 shadow-xs space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold text-[#2E6B34] bg-[#A8D5A2]/30 px-2 py-0.5 rounded-md uppercase">
                  {evt.type}
                </span>
                <h3 className="text-sm font-bold text-[#1F2A1F] leading-snug mt-1">
                  {evt.title}
                </h3>
              </div>
              <span className="text-xs font-extrabold text-[#7A5230] bg-amber-50 px-2.5 py-1 rounded-xl shrink-0">
                {evt.registeredCount} Peserta
              </span>
            </div>

            <p className="text-xs text-gray-700 leading-relaxed">
              {evt.description}
            </p>

            <div className="space-y-1.5 text-xs text-gray-600 bg-[#FAF6EC] p-3 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-[#2E6B34]" />
                <span className="font-semibold text-gray-800">{evt.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span>{evt.time}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#7A5230]" />
                <span>{evt.location}</span>
              </div>
              <div className="text-[11px] text-gray-500 pt-1 border-t border-gray-200">
                Penyelenggara: <strong>{evt.organizer}</strong>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => handleToggleRegister(evt.id)}
                className={`touch-target flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs ${
                  evt.isRegistered
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-[#2E6B34] text-white hover:bg-[#235328]'
                }`}
              >
                {evt.isRegistered ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Terdaftar Hadir</span>
                  </>
                ) : (
                  <span>{isGuest ? 'Masuk untuk mendaftar' : 'Daftar Hadir Gotong Royong'}</span>
                )}
              </button>

              <button
                onClick={() => setActiveQrEvent(evt)}
                className="touch-target p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
                title="Tampilkan Kode QR Absensi"
              >
                <QrCode className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleReminder(evt)}
                className="touch-target p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
                title="Set Pengingat"
              >
                <Bell className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* QR Attendance Modal */}
      {activeQrEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-[#FAF6EC] border border-[#2E6B34]/25 p-5 shadow-2xl text-center space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <span className="text-xs font-bold text-[#2E6B34] uppercase tracking-wider">
                Absensi QR Marsiadapari
              </span>
              <button
                onClick={() => setActiveQrEvent(null)}
                className="p-1 text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="text-sm font-bold font-poppins text-[#1F2A1F]">
                {activeQrEvent.title}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">{activeQrEvent.date}</p>
            </div>

            {/* Simulated QR Code Graphic */}
            <div className="w-48 h-48 mx-auto bg-white p-3 rounded-2xl border-2 border-[#2E6B34] shadow-sm flex flex-col items-center justify-center relative">
              <div className="grid grid-cols-6 gap-1 w-full h-full p-2">
                {Array.from({ length: 36 }).map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-xs ${
                      (i * 7 + 3) % 2 === 0 ? 'bg-[#2E6B34]' : 'bg-gray-100'
                    }`}
                  />
                ))}
              </div>
              <span className="text-[10px] font-mono text-gray-600 mt-1">
                {activeQrEvent.qrCode}
              </span>
            </div>

            <p className="text-xs text-gray-600">
              Tunjukkan kode QR ini kepada panitia ibadah/pemimpin aksi untuk pencatatan kehadiran gotong royong.
            </p>

            <button
              onClick={() => setActiveQrEvent(null)}
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
