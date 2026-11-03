import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  QrCode,
  Bell,
  X,
  Share2,
  ChevronLeft,
  ChevronRight,
  List,
  Sparkles,
  CalendarCheck,
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
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // Calendar date selection
  const [currentMonth, setCurrentMonth] = useState(() => new Date(2026, 10, 1)); // November 2026 default
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

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

  // Helper to parse event dates like "2026-11-08" or "Sabtu, 21 November 2026"
  const getEventDateKey = (dateStr: string): string => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const match = dateStr.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
    if (!match) return dateStr;
    const day = match[1].padStart(2, '0');
    const monthMap: Record<string, string> = {
      januari: '01', februari: '02', maret: '03', april: '04', mei: '05', juni: '06',
      juli: '07', agustus: '08', september: '09', oktober: '10', november: '11', desember: '12',
    };
    const month = monthMap[match[2].toLowerCase()] || '11';
    const year = match[3];
    return `${year}-${month}-${day}`;
  };

  // Calendar math
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const monthName = currentMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Adjust so Monday is day 0, Sunday is day 6
  const startingDayOffset = (firstDayOfMonth + 6) % 7;

  // Map events to date strings
  const eventsByDate = new Map<string, GreenEvent[]>();
  events.forEach((evt) => {
    const key = getEventDateKey(evt.date);
    const existing = eventsByDate.get(key) || [];
    eventsByDate.set(key, [...existing, evt]);
  });

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
    setSelectedDate(null);
  };

  // Filtered events
  const displayedEvents = selectedDate
    ? events.filter((e) => getEventDateKey(e.date) === selectedDate)
    : events;

  return (
    <div className="space-y-4 pb-24 pt-2 px-4 max-w-4xl mx-auto">
      {/* Header & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-bold text-[#7A5230] dark:text-amber-400 uppercase tracking-wider">
            Persekutuan &amp; Aksi Bersama
          </span>
          <h2 className="text-lg sm:text-xl font-bold font-poppins text-[#1F2A1F] dark:text-[#E8EFE8]">
            Event &amp; Ibadah Hijau
          </h2>
          <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
            Jadwal kebaktian Minggu Ciptaan dan aksi gotong royong di kawasan Danau Toba
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 p-1 bg-gray-200/80 dark:bg-black/40 rounded-2xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              viewMode === 'calendar'
                ? 'bg-white dark:bg-[#1C2C20] text-[#2E6B34] dark:text-emerald-300 shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Kalender</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode('list');
              setSelectedDate(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              viewMode === 'list'
                ? 'bg-white dark:bg-[#1C2C20] text-[#2E6B34] dark:text-emerald-300 shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Semua Jadwal ({events.length})</span>
          </button>
        </div>
      </div>

      {reminderToast && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 rounded-2xl border border-emerald-300 dark:border-emerald-700 text-xs font-semibold animate-in fade-in text-center">
          🔔 {reminderToast}
        </div>
      )}

      {/* Calendar View Component */}
      {viewMode === 'calendar' && (
        <div className="rounded-3xl bg-white dark:bg-[#131F15] border border-gray-200/90 dark:border-white/10 p-4 sm:p-5 shadow-xs space-y-4">
          {/* Month Header Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-[#2E6B34] dark:text-emerald-400" />
              <h3 className="text-sm font-bold font-poppins text-gray-900 dark:text-white capitalize">
                {monthName}
              </h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 transition cursor-pointer"
                aria-label="Bulan sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentMonth(new Date());
                  setSelectedDate(null);
                }}
                className="px-2 py-1 text-[11px] font-semibold text-[#2E6B34] dark:text-emerald-400 hover:underline"
              >
                Bulan Ini
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 transition cursor-pointer"
                aria-label="Bulan berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 text-center text-[11px] font-bold text-gray-500 dark:text-gray-400 pb-1 border-b border-gray-100 dark:border-white/10">
            <span>Sen</span>
            <span>Sel</span>
            <span>Rab</span>
            <span>Kam</span>
            <span>Jum</span>
            <span>Sab</span>
            <span>Min</span>
          </div>

          {/* Calendar Grid Cells */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center">
            {/* Empty slots before first day */}
            {Array.from({ length: startingDayOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="h-10 sm:h-12 rounded-xl opacity-20 pointer-events-none" />
            ))}

            {/* Days in Month */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const hasEvents = eventsByDate.has(dateKey);
              const eventCount = eventsByDate.get(dateKey)?.length || 0;
              const isSelected = selectedDate === dateKey;

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => setSelectedDate(isSelected ? null : dateKey)}
                  className={`h-10 sm:h-12 rounded-2xl flex flex-col items-center justify-center relative transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-[#2E6B34] text-white shadow-md scale-105 font-bold z-10'
                      : hasEvents
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700/60 font-bold hover:bg-emerald-100'
                      : 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 font-medium'
                  }`}
                  title={hasEvents ? `${eventCount} agenda pada tanggal ini` : `Pilih ${dateKey}`}
                >
                  <span className="text-xs sm:text-sm">{dayNum}</span>
                  {hasEvents && (
                    <span className="flex items-center gap-0.5 mt-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-amber-300' : 'bg-emerald-600 dark:bg-emerald-400 animate-pulse'}`} />
                      {eventCount > 1 && (
                        <span className={`text-[9px] leading-none ${isSelected ? 'text-amber-200' : 'text-emerald-700 dark:text-emerald-300'}`}>
                          {eventCount}
                        </span>
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Date Filter Status */}
          {selectedDate && (
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200">
              <span className="font-semibold">
                📅 Menampilkan agenda pada tanggal: <strong>{selectedDate}</strong> ({displayedEvents.length} kegiatan)
              </span>
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="text-xs font-bold text-[#2E6B34] dark:text-emerald-400 hover:underline"
              >
                Lihat Semua
              </button>
            </div>
          )}
        </div>
      )}

      {/* Events List */}
      <div className="space-y-3">
        {displayedEvents.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#2E6B34]/25 bg-white dark:bg-[#131F15] p-8 text-center">
            <CalendarIcon className="mx-auto h-8 w-8 text-[#2E6B34]/50 dark:text-emerald-400/50" />
            <p className="mt-3 text-sm font-bold text-[#1F2A1F] dark:text-white">
              {selectedDate ? 'Tidak ada agenda pada tanggal yang dipilih' : 'Belum ada kegiatan terjadwal'}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {selectedDate ? 'Pilih tanggal lain yang bertanda titik hijau pada kalender.' : 'Kegiatan akan muncul di sini setelah ditambahkan oleh pemimpin organisasi.'}
            </p>
            {selectedDate && (
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="mt-3 px-3 py-1.5 rounded-xl bg-[#2E6B34] text-white text-xs font-bold hover:bg-[#235328] transition"
              >
                Tampilkan Semua Jadwal
              </button>
            )}
          </div>
        ) : (
          displayedEvents.map((evt) => (
            <div
              key={evt.id}
              className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#131F15] border border-gray-200/90 dark:border-white/10 shadow-xs space-y-3 transition-all hover:border-[#2E6B34]/40"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold text-[#2E6B34] dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/70 border border-emerald-300/40 dark:border-emerald-700/40 px-2.5 py-0.5 rounded-full uppercase">
                    {evt.type}
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-[#1F2A1F] dark:text-white leading-snug mt-1.5">
                    {evt.title}
                  </h3>
                </div>
                <span className="text-xs font-extrabold text-[#7A5230] dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-3 py-1 rounded-xl shrink-0 border border-amber-200 dark:border-amber-800/40">
                  {evt.registeredCount} Peserta
                </span>
              </div>

              <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                {evt.description}
              </p>

              <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-300 bg-[#FAF6EC] dark:bg-[#17271B] p-3 rounded-2xl border border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-3.5 h-3.5 text-[#2E6B34] dark:text-emerald-400 shrink-0" />
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{evt.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span>{evt.time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#7A5230] dark:text-amber-400 shrink-0" />
                  <span>{evt.location}</span>
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-200/80 dark:border-white/10">
                  Penyelenggara: <strong className="text-gray-700 dark:text-gray-200">{evt.organizer}</strong>
                </div>
              </div>

              {/* Action Buttons: Register Participation & QR Code Pass */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleToggleRegister(evt.id)}
                  className={`touch-target flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-98 ${
                    evt.isRegistered
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-200'
                      : 'bg-[#2E6B34] hover:bg-[#235328] dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white shadow-emerald-900/20'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{evt.isRegistered ? 'Terdaftar (Klik untuk Batal)' : 'Daftar Partisipasi'}</span>
                </button>

                {evt.isRegistered && (
                  <button
                    type="button"
                    onClick={() => setActiveQrEvent(evt)}
                    className="p-2.5 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/20 transition cursor-pointer"
                    title="Buka QR Pass Kehadiran"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleReminder(evt)}
                  className="p-2.5 rounded-xl border border-gray-300 dark:border-white/15 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition cursor-pointer"
                  title="Pasang Pengingat"
                >
                  <Bell className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* QR Code Pass Modal */}
      {activeQrEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-xs rounded-3xl bg-[#FAF6EC] dark:bg-[#121C14] text-[#1F2A1F] dark:text-white border border-[#2E6B34]/30 p-5 shadow-2xl text-center space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200/80 dark:border-white/10">
              <span className="text-xs font-bold text-[#2E6B34] dark:text-emerald-400">Pass Gotong Royong</span>
              <button
                type="button"
                onClick={() => setActiveQrEvent(null)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-bold font-poppins">{activeQrEvent.title}</h4>
              <p className="text-[11px] text-gray-600 dark:text-gray-300">{activeQrEvent.date} &bull; {activeQrEvent.time}</p>
            </div>

            {/* QR Visual */}
            <div className="p-4 bg-white rounded-2xl border-2 border-dashed border-[#2E6B34]/40 mx-auto w-44 h-44 flex flex-col items-center justify-center shadow-inner">
              <QrCode className="w-28 h-28 text-[#2E6B34]" />
              <span className="text-[10px] font-mono font-bold tracking-wider text-gray-700 mt-2">
                {activeQrEvent.qrCode}
              </span>
            </div>

            <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">
              Tunjukkan kode QR ini kepada koordinator gotong royong di lokasi untuk presensi dan verifikasi Poin Hijau.
            </p>

            <button
              type="button"
              onClick={() => setActiveQrEvent(null)}
              className="w-full py-2.5 rounded-xl bg-[#2E6B34] text-white text-xs font-bold hover:bg-[#235328] transition"
            >
              Tutup Pass
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
