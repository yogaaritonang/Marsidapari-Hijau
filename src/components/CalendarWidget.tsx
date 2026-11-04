import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Users,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { GreenEvent } from '../types';
import { StorageService } from '../services/storageService';

interface CalendarWidgetProps {
  onNavigateTab: (tab: string) => void;
  isGuest?: boolean;
  onRequireAuth?: () => void;
  className?: string;
}

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({
  onNavigateTab,
  isGuest = false,
  onRequireAuth,
  className = '',
}) => {
  const [events, setEvents] = useState<GreenEvent[]>(() => StorageService.getEvents());
  const [currentMonth, setCurrentMonth] = useState(() => new Date(2026, 10, 1)); // Default November 2026
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Sync automatically whenever admin adds, updates, or deletes events
  useEffect(() => {
    const handleEventsUpdate = () => {
      setEvents(StorageService.getEvents());
    };
    window.addEventListener('mh-data-updated', handleEventsUpdate);
    window.addEventListener('mh-shared-data-change', handleEventsUpdate);
    window.addEventListener('storage', handleEventsUpdate);
    return () => {
      window.removeEventListener('mh-data-updated', handleEventsUpdate);
      window.removeEventListener('mh-shared-data-change', handleEventsUpdate);
      window.removeEventListener('storage', handleEventsUpdate);
    };
  }, []);

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

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const monthName = currentMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startingDayOffset = (firstDayOfMonth + 6) % 7; // Monday = 0

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

  const handleToggleRegister = (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isGuest && onRequireAuth) {
      onRequireAuth();
      return;
    }
    StorageService.toggleEventRegistration(eventId);
    setEvents(StorageService.getEvents());
  };

  const activeEvents = selectedDate
    ? (eventsByDate.get(selectedDate) || [])
    : events.slice(0, 3);

  return (
    <div className={`rounded-3xl bg-white dark:bg-[#121B14] border border-[#2E6B34]/20 dark:border-white/10 p-4 sm:p-5 shadow-xs transition-all ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-gray-100 dark:border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-100/80 dark:bg-emerald-950/80 text-[#2E6B34] dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold font-poppins text-[#1F2A1F] dark:text-white leading-tight">
              Kalender Kegiatan Gotong Royong
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Aksi lingkungan &amp; ibadah alam terjadwal seputar Danau Toba
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab('events')}
          className="inline-flex items-center gap-1 text-xs font-bold text-[#2E6B34] dark:text-emerald-400 hover:underline self-start sm:self-auto cursor-pointer group"
        >
          <span>Lihat Semua ({events.length})</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Mini Calendar Month Bar & Days Grid */}
      <div className="pt-3 pb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-gray-800 dark:text-gray-200 capitalize">
            {monthName}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition cursor-pointer"
              title="Bulan sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition cursor-pointer"
              title="Bulan berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Day Header */}
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-gray-400 dark:text-gray-500 mb-1">
          {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((day) => (
            <div key={day} className="py-0.5">{day}</div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startingDayOffset }).map((_, i) => (
            <div key={`empty-${i}`} className="h-7 sm:h-8" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dayKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const dayEvents = eventsByDate.get(dayKey);
            const hasEvents = Boolean(dayEvents && dayEvents.length > 0);
            const isSelected = selectedDate === dayKey;

            return (
              <button
                key={dayKey}
                type="button"
                onClick={() => setSelectedDate(isSelected ? null : dayKey)}
                className={`h-7 sm:h-8 rounded-lg flex flex-col items-center justify-center relative text-xs font-medium transition cursor-pointer ${
                  isSelected
                    ? 'bg-[#2E6B34] text-white font-bold shadow-xs scale-105'
                    : hasEvents
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-[#2E6B34] dark:text-emerald-300 font-bold hover:bg-emerald-100'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'
                }`}
              >
                <span>{dayNum}</span>
                {hasEvents && !isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 absolute bottom-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Events List for Selected Day or Upcoming */}
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/10 space-y-2.5">
        <div className="flex items-center justify-between text-xs font-semibold text-gray-600 dark:text-gray-400">
          <span>
            {selectedDate
              ? `Aksi pada ${selectedDate}:`
              : 'Agenda Aksi Gotong Royong Terdekat:'}
          </span>
          {selectedDate && (
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              className="text-[11px] text-[#2E6B34] dark:text-emerald-400 underline cursor-pointer"
            >
              Lihat Semua
            </button>
          )}
        </div>

        {activeEvents.map((evt) => {
          const isCrossComm = evt.organizer.includes('Lintas') || evt.organizer.includes('Semua');
          return (
            <div
              key={evt.id}
              onClick={() => onNavigateTab('events')}
              className="p-3 rounded-2xl border border-gray-200/90 dark:border-white/10 hover:border-[#2E6B34] dark:hover:border-emerald-500 bg-gray-50/60 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 transition shadow-2xs cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    evt.type === 'Penanaman Pohon'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : evt.type === 'Aksi Bersih'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                  }`}>
                    {evt.type}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    isCrossComm
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                      : 'bg-gray-200/70 text-gray-700 dark:bg-white/10 dark:text-gray-300'
                  }`}>
                    {isCrossComm ? '🌐 Lintas Komunitas' : evt.organizer}
                  </span>
                </div>

                <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white group-hover:text-[#2E6B34] dark:group-hover:text-emerald-400 transition-colors line-clamp-1">
                  {evt.title}
                </h4>

                <div className="mt-1 flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#2E6B34] dark:text-emerald-400" />
                    {evt.date} &bull; {evt.time}
                  </span>
                  <span className="flex items-center gap-1 truncate max-w-[200px]">
                    <MapPin className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    {evt.location}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <button
                  type="button"
                  onClick={(e) => handleToggleRegister(evt.id, e)}
                  className={`touch-target px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 active:scale-95 cursor-pointer shadow-2xs ${
                    evt.isRegistered
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                      : 'bg-[#2E6B34] hover:bg-[#235328] text-white'
                  }`}
                >
                  {evt.isRegistered ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Terdaftar</span>
                    </>
                  ) : (
                    <span>Ikut Aksi</span>
                  )}
                </button>
              </div>
            </div>
          );
        })}

        {activeEvents.length === 0 && (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-xs">
            <p>Tidak ada kegiatan terjadwal pada tanggal ini.</p>
          </div>
        )}
      </div>
    </div>
  );
};
