'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  Plus,
  MapPin,
  Clock,
  Trash2,
  Users,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  List,
  Calendar as CalendarIcon,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useFamily } from '@/context/family-context';
import { CreatorBadge } from '@/components/creator-badge';
import { CalendarEvent } from '@/types/family';
import { MEMBER_TOCHTER_ID } from '@/lib/seed-data';

const WEEKDAY_NAMES = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

// Generate 15-minute step time options ("00:00", "00:15", ..., "23:45")
const TIME_OPTIONS_15MIN: string[] = [];
for (let h = 0; h < 24; h++) {
  for (const m of [0, 15, 30, 45]) {
    TIME_OPTIONS_15MIN.push(
      `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    );
  }
}

function addOneHourToTime(timeStr: string): string {
  const [hStr, mStr] = timeStr.split(':');
  const h = Number(hStr) || 0;
  const m = Number(mStr) || 0;
  const nextH = Math.min(23, h + 1);
  const nextM = h === 23 ? 45 : m;
  return `${String(nextH).padStart(2, '0')}:${String(nextM).padStart(2, '0')}`;
}

export default function CalendarPage() {
  const {
    calendarEvents,
    addCalendarEvent,
    deleteCalendarEvent,
    members,
    getMemberById,
    isSyncingGoogle,
    syncWithGoogleCalendar,
    googleSyncConfig,
  } = useFamily();

  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate()
  ).padStart(2, '0')}`;

  // Calendar View State: Month navigation + Selected Day
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0-11
  const [selectedDayIso, setSelectedDayIso] = useState<string>(todayIso);
  const [viewMode, setViewMode] = useState<'calendar' | 'agenda'>('calendar');

  // New Event Form State (No manual category selector; 15-min time steps; auto +1h)
  const [title, setTitle] = useState('');
  const [dateStr, setDateStr] = useState(todayIso);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [isAllDay, setIsAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [assignedIds, setAssignedIds] = useState<string[]>([members[0]?.id || '']);

  // Filters: Member Filter (Chiara always shown) + Auto Events Toggle (Default: false / hidden)
  const [filterMemberId, setFilterMemberId] = useState<string>('all');
  const [showAutoEvents, setShowAutoEvents] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);
    setEndTime(addOneHourToTime(newStart));
  };

  const toggleMemberAssignment = (id: string) => {
    setAssignedIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  // Dedicated color logic:
  // - Auto-generated entries (meal, todo, leisure) get dedicated colors
  // - Manual entries: if > 1 person affected -> Gray (#64748B), if 1 person -> member's color_hex
  const getEventVisual = (ev: CalendarEvent): { hex: string; label: string; isAuto: boolean } => {
    if (ev.category === 'meal') {
      return { hex: '#10B981', label: '🍽️ Essen (Auto)', isAuto: true };
    }
    if (ev.category === 'todo') {
      return { hex: '#D97706', label: '📌 ToDo (Auto)', isAuto: true };
    }
    if (ev.category === 'leisure') {
      return { hex: '#0EA5E9', label: '🏔️ Ausflug (Auto)', isAuto: true };
    }

    if (ev.assigned_member_ids.length > 1) {
      const names = ev.assigned_member_ids
        .map((id) => getMemberById(id)?.display_name)
        .filter(Boolean)
        .join(' + ');
      return { hex: '#64748B', label: names || 'Mehrere Personen', isAuto: false };
    }

    if (ev.assigned_member_ids.length === 1) {
      const m = getMemberById(ev.assigned_member_ids[0]);
      return {
        hex: m?.color_hex || '#5CA6CE',
        label: m?.display_name || 'Termin',
        isAuto: false,
      };
    }

    return { hex: '#64748B', label: 'Termin', isAuto: false };
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(11);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(0);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleJumpToToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setSelectedDayIso(todayIso);
  };

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const startIso = isAllDay
      ? `${dateStr}T00:00:00.000Z`
      : new Date(`${dateStr}T${startTime}:00`).toISOString();
    const endIso = isAllDay
      ? `${dateStr}T23:59:59.000Z`
      : new Date(`${dateStr}T${endTime}:00`).toISOString();

    addCalendarEvent({
      title: title.trim(),
      description: description.trim() || null,
      location: location.trim() || null,
      start_at: startIso,
      end_at: endIso,
      is_all_day: isAllDay,
      assigned_member_ids: assignedIds.length > 0 ? assignedIds : [members[0].id],
      category: 'family',
    });

    setTitle('');
    setLocation('');
    setDescription('');
  };

  const handleTriggerGoogleSync = async () => {
    const res = await syncWithGoogleCalendar();
    setSyncMessage(res.message);
    setTimeout(() => setSyncMessage(null), 7000);
  };

  // Filter Events:
  // 1. Auto-generated entries (meal, todo, leisure) are hidden by default unless showAutoEvents is true
  // 2. Chiara (MEMBER_TOCHTER_ID) is ALWAYS shown even when filtering for Sandro or Jenni
  const visibleEvents = useMemo(() => {
    return calendarEvents.filter((ev) => {
      const isAuto =
        ev.category === 'meal' || ev.category === 'todo' || ev.category === 'leisure';
      if (isAuto && !showAutoEvents) return false;

      if (filterMemberId === 'all') return true;

      const includesSelected = ev.assigned_member_ids.includes(filterMemberId);
      const includesChiara = ev.assigned_member_ids.includes(MEMBER_TOCHTER_ID);
      return includesSelected || includesChiara;
    });
  }, [calendarEvents, filterMemberId, showAutoEvents]);

  // Build Month Grid matrix
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;

  const prevMonthDaysCount = new Date(currentYear, currentMonth, 0).getDate();
  const calendarCells: {
    iso: string;
    dayNum: number;
    isCurrentMonth: boolean;
    isToday: boolean;
  }[] = [];

  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthDaysCount - i;
    const prevMonthDate = new Date(Date.UTC(currentYear, currentMonth - 1, dayNum));
    const iso = prevMonthDate.toISOString().split('T')[0];
    calendarCells.push({
      iso,
      dayNum,
      isCurrentMonth: false,
      isToday: iso === todayIso,
    });
  }

  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const curDate = new Date(Date.UTC(currentYear, currentMonth, d));
    const iso = curDate.toISOString().split('T')[0];
    calendarCells.push({
      iso,
      dayNum: d,
      isCurrentMonth: true,
      isToday: iso === todayIso,
    });
  }

  const remainingCells = (7 - (calendarCells.length % 7)) % 7;
  for (let n = 1; n <= remainingCells; n++) {
    const nextDate = new Date(Date.UTC(currentYear, currentMonth + 1, n));
    const iso = nextDate.toISOString().split('T')[0];
    calendarCells.push({
      iso,
      dayNum: n,
      isCurrentMonth: false,
      isToday: iso === todayIso,
    });
  }

  const monthLabel = new Intl.DateTimeFormat('de-CH', {
    month: 'long',
    year: 'numeric',
  }).format(firstDayOfMonth);

  const selectedDayEvents = visibleEvents.filter(
    (ev) => ev.start_at.slice(0, 10) === selectedDayIso
  );

  const selectedDayLabel = new Intl.DateTimeFormat('de-CH', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${selectedDayIso}T12:00:00`));

  return (
    <div className="space-y-4">
      {syncMessage && (
        <div className="bg-[#74956C] text-white px-4 py-2.5 rounded-2xl shadow-sm flex items-center justify-between text-xs font-bold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{syncMessage}</span>
          </div>
          <Link
            href="/settings"
            className="px-2.5 py-1 rounded-lg bg-white text-[#74956C] text-xs font-extrabold shrink-0"
          >
            Sync-Setup
          </Link>
        </div>
      )}

      {/* Compact Header & Filter Bar */}
      <div className="bg-white px-4 py-3 rounded-2xl shadow-xs border border-slate-200/90 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-[#5CA6CE]" />
            <h1 className="text-base sm:text-lg font-extrabold text-[#1E293B]">
              Familienkalender
            </h1>
            <span className="hidden md:inline text-[11px] font-semibold text-slate-500">
              • Chiara wird immer mit angezeigt
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Switcher */}
            <div className="bg-[#F4F7F5] p-1 rounded-xl border border-slate-200 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                  viewMode === 'calendar'
                    ? 'bg-[#74956C] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarIcon className="h-3.5 w-3.5" />
                Monat
              </button>
              <button
                type="button"
                onClick={() => setViewMode('agenda')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                  viewMode === 'agenda'
                    ? 'bg-[#74956C] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="h-3.5 w-3.5" />
                Liste
              </button>
            </div>

            <button
              type="button"
              onClick={handleTriggerGoogleSync}
              disabled={isSyncingGoogle}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#5CA6CE] hover:bg-[#488eb5] disabled:opacity-60 text-white text-xs font-bold shadow-xs transition-all"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncingGoogle ? 'animate-spin' : ''}`} />
              {isSyncingGoogle ? 'Sync...' : 'Google Sync'}
            </button>
          </div>
        </div>

        {/* Filter Row: Member Filter (Chiara always included) & Auto-Events Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1 bg-[#F4F7F5] p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setFilterMemberId('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                filterMemberId === 'all' ? 'bg-[#1E293B] text-white' : 'text-slate-600'
              }`}
            >
              Alle
            </button>
            {members
              .filter((m) => m.role !== 'kiosk')
              .map((m) => {
                const isSelected = filterMemberId === m.id;
                const isChiara = m.id === MEMBER_TOCHTER_ID;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setFilterMemberId(m.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                      isSelected ? 'text-white shadow-2xs' : 'text-slate-600 hover:bg-white'
                    }`}
                    style={isSelected ? { backgroundColor: m.color_hex } : undefined}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: isSelected ? '#FFFFFF' : m.color_hex }}
                    />
                    <span>{m.display_name}</span>
                    {!isChiara && isSelected && (
                      <span className="text-[10px] opacity-90 font-normal">+ Chiara</span>
                    )}
                  </button>
                );
              })}
          </div>

          {/* Toggle for Auto-Generated Entries (Default: hidden) */}
          <button
            type="button"
            onClick={() => setShowAutoEvents((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
              showAutoEvents
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-[#F4F7F5] border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            {showAutoEvents ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            <span>
              Automatische Einträge (Essen, ToDo, Ausflüge){' '}
              {showAutoEvents ? 'eingeblendet' : 'ausgeblendet'}
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left 4 Columns: New Event Form */}
        <form
          onSubmit={handleAddEvent}
          className="lg:col-span-4 bg-white p-4 rounded-2xl shadow-xs border border-slate-200/90 space-y-3.5 h-fit"
        >
          <h2 className="font-extrabold text-sm sm:text-base text-[#1E293B] flex items-center gap-2">
            <Plus className="h-4 w-4 text-[#74956C]" />
            Neuen Termin eintragen
          </h2>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Termin-Titel</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Kinderarzt, Elternabend, Sport..."
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-[#1E293B] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#74956C]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Datum</label>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-[#1E293B]"
            />
          </div>

          <div className="flex items-center justify-between bg-[#F4F7F5] px-3 py-2 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-700">Ganztägiger Termin</span>
            <input
              type="checkbox"
              checked={isAllDay}
              onChange={(e) => setIsAllDay(e.target.checked)}
              className="h-4 w-4 accent-[#74956C]"
            />
          </div>

          {!isAllDay && (
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  Von (15-Min Schritte)
                </label>
                <select
                  value={startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-[#1E293B]"
                >
                  {TIME_OPTIONS_15MIN.map((t) => (
                    <option key={`start-${t}`} value={t}>
                      {t} Uhr
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  Bis (Auto +1 Std.)
                </label>
                <select
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-[#1E293B]"
                >
                  {TIME_OPTIONS_15MIN.map((t) => (
                    <option key={`end-${t}`} value={t}>
                      {t} Uhr
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1.5 flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-[#74956C]" />
              Betroffene Personen (Farbe im Kalender)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {members
                .filter((m) => m.role !== 'kiosk')
                .map((member) => {
                  const selected = assignedIds.includes(member.id);
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => toggleMemberAssignment(member.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                        selected
                          ? 'text-white border-transparent shadow-2xs'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                      style={selected ? { backgroundColor: member.color_hex } : undefined}
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor: selected ? '#FFFFFF' : member.color_hex,
                        }}
                      />
                      {member.display_name}
                    </button>
                  );
                })}
            </div>
            {assignedIds.length > 1 && (
              <p className="text-[11px] font-semibold text-slate-500 mt-1">
                ℹ️ Da mehr als 1 Person betroffen ist, wird der Termin im Kalender <strong>grau</strong> dargestellt.
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Ort (optional)</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="z.B. Grüt, Wetzikon, Hinwil..."
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-[#1E293B] placeholder:text-slate-400"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-[#74956C] hover:bg-[#618059] text-white font-bold text-sm shadow-xs transition-colors"
          >
            Termin speichern
          </button>

          {/* Color Legend */}
          <div className="pt-2 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-600">
            <p className="font-bold text-slate-700">Farblegende im Kalender:</p>
            <div className="flex flex-wrap gap-2">
              {members
                .filter((m) => m.role !== 'kiosk')
                .map((m) => (
                  <span key={m.id} className="inline-flex items-center gap-1 font-semibold">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: m.color_hex }}
                    />
                    {m.display_name}
                  </span>
                ))}
              <span className="inline-flex items-center gap-1 font-semibold">
                <span className="h-2.5 w-2.5 rounded-full bg-[#64748B]" />
                &gt;1 Person (Grau)
              </span>
            </div>
            <div className="flex flex-wrap gap-2 pt-0.5">
              <span className="inline-flex items-center gap-1 font-semibold">
                <span className="h-2.5 w-2.5 rounded-full bg-[#10B981]" />
                Essen (Auto)
              </span>
              <span className="inline-flex items-center gap-1 font-semibold">
                <span className="h-2.5 w-2.5 rounded-full bg-[#D97706]" />
                ToDo (Auto)
              </span>
              <span className="inline-flex items-center gap-1 font-semibold">
                <span className="h-2.5 w-2.5 rounded-full bg-[#0EA5E9]" />
                Ausflug (Auto)
              </span>
            </div>
          </div>
        </form>

        {/* Right 8 Columns: INTERACTIVE CALENDAR VIEW OR LIST AGENDA */}
        <div className="lg:col-span-8 space-y-4">
          {viewMode === 'calendar' ? (
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
              {/* Month Navigation Toolbar */}
              <div className="px-4 py-3 border-b border-slate-200/90 flex items-center justify-between gap-3 bg-[#F4F7F5]/50">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base sm:text-lg font-extrabold text-[#1E293B] capitalize">
                    {monthLabel}
                  </h2>
                  <button
                    type="button"
                    onClick={handleJumpToToday}
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors shadow-2xs"
                  >
                    Heute
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors"
                    title="Vorheriger Monat"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors"
                    title="Nächster Monat"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Weekday Header */}
              <div className="grid grid-cols-7 border-b border-slate-200 bg-[#F4F7F5] text-center text-xs font-extrabold text-slate-600 py-2">
                {WEEKDAY_NAMES.map((name) => (
                  <div key={name}>{name}</div>
                ))}
              </div>

              {/* Calendar Grid Matrix */}
              <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100">
                {calendarCells.map((cell) => {
                  const dayEvents = visibleEvents.filter(
                    (ev) => ev.start_at.slice(0, 10) === cell.iso
                  );
                  const isSelected = selectedDayIso === cell.iso;

                  return (
                    <div
                      key={cell.iso}
                      onClick={() => {
                        setSelectedDayIso(cell.iso);
                        setDateStr(cell.iso);
                      }}
                      className={`min-h-[75px] sm:min-h-[92px] p-1.5 sm:p-2 cursor-pointer transition-all flex flex-col justify-between ${
                        cell.isCurrentMonth ? 'bg-white' : 'bg-slate-50/60 text-slate-400'
                      } ${
                        isSelected
                          ? 'ring-2 ring-inset ring-[#74956C] bg-[#74956C]/5'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-extrabold ${
                            cell.isToday
                              ? 'bg-[#74956C] text-white shadow-2xs'
                              : isSelected
                              ? 'text-[#74956C] font-black'
                              : cell.isCurrentMonth
                              ? 'text-[#1E293B]'
                              : 'text-slate-400'
                          }`}
                        >
                          {cell.dayNum}
                        </span>

                        {dayEvents.length > 0 && (
                          <span className="text-[10px] font-bold text-slate-400 hidden sm:inline">
                            {dayEvents.length}
                          </span>
                        )}
                      </div>

                      {/* Event Indicator Pills */}
                      <div className="space-y-1 mt-1 overflow-hidden">
                        {dayEvents.slice(0, 2).map((ev) => {
                          const visual = getEventVisual(ev);
                          return (
                            <div
                              key={ev.id}
                              className="px-1.5 py-0.5 rounded-md text-[10px] font-bold truncate leading-tight hidden sm:flex items-center gap-1 text-white"
                              style={{ backgroundColor: visual.hex }}
                              title={`${ev.title} (${visual.label})`}
                            >
                              <span className="truncate">{ev.title}</span>
                            </div>
                          );
                        })}

                        {/* Mobile Dot Row */}
                        <div className="flex sm:hidden items-center justify-center gap-1 pt-1">
                          {dayEvents.slice(0, 3).map((ev) => {
                            const visual = getEventVisual(ev);
                            return (
                              <span
                                key={ev.id}
                                className="h-2 w-2 rounded-full shrink-0"
                                style={{ backgroundColor: visual.hex }}
                              />
                            );
                          })}
                        </div>

                        {dayEvents.length > 2 && (
                          <div className="text-[9px] font-extrabold text-slate-400 text-center sm:text-left hidden sm:block">
                            +{dayEvents.length - 2} weitere
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected Day Agenda Box underneath Calendar */}
              <div className="p-4 border-t border-slate-200 bg-[#F4F7F5]/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-[#1E293B]">
                      {selectedDayLabel} ({selectedDayEvents.length} Termine)
                    </h3>
                  </div>
                </div>

                {selectedDayEvents.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-1">
                    Keine sichtbaren Termine für diesen Tag.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedDayEvents.map((ev) => {
                      const d = new Date(ev.start_at);
                      const endD = new Date(ev.end_at);
                      const timeFormatted = ev.is_all_day
                        ? 'Ganztägig'
                        : `${d.toTimeString().slice(0, 5)} – ${endD.toTimeString().slice(0, 5)} Uhr`;
                      const visual = getEventVisual(ev);

                      return (
                        <div
                          key={ev.id}
                          className="bg-white rounded-xl p-3 shadow-2xs border border-slate-200/90 flex items-start justify-between gap-3"
                          style={{ borderLeftWidth: '5px', borderLeftColor: visual.hex }}
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase text-white"
                                style={{ backgroundColor: visual.hex }}
                              >
                                {visual.label}
                              </span>
                              <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5 text-[#5CA6CE]" />
                                {timeFormatted}
                              </span>
                            </div>

                            <p className="font-extrabold text-sm sm:text-base text-[#1E293B]">
                              {ev.title}
                            </p>

                            {ev.location && (
                              <p className="text-xs text-slate-600 flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5 text-[#5CA6CE]" />
                                {ev.location}
                              </p>
                            )}

                            {ev.description && (
                              <p className="text-xs text-slate-500">{ev.description}</p>
                            )}

                            {ev.external_url && (
                              <a
                                href={ev.external_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-bold text-[#5CA6CE] hover:underline"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Verknüpften Link öffnen
                              </a>
                            )}

                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              {ev.assigned_member_ids.map((mId) => (
                                <CreatorBadge key={mId} memberId={mId} />
                              ))}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => deleteCalendarEvent(ev.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg shrink-0"
                            title="Termin löschen"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Agenda List View */
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-sm sm:text-base text-[#1E293B]">
                  Kommende Termine ({visibleEvents.length})
                </h2>
                {googleSyncConfig.last_synced_at && (
                  <span className="text-[11px] font-semibold text-[#74956C]">
                    Letzter Google Sync:{' '}
                    {new Date(googleSyncConfig.last_synced_at).toTimeString().slice(0, 5)} Uhr
                  </span>
                )}
              </div>

              {visibleEvents.map((ev) => {
                const d = new Date(ev.start_at);
                const endD = new Date(ev.end_at);
                const dateFormatted = new Intl.DateTimeFormat('de-CH', {
                  weekday: 'short',
                  day: '2-digit',
                  month: 'short',
                }).format(d);
                const timeFormatted = ev.is_all_day
                  ? 'Ganztägig'
                  : `${d.toTimeString().slice(0, 5)} – ${endD.toTimeString().slice(0, 5)} Uhr`;
                const visual = getEventVisual(ev);

                return (
                  <div
                    key={ev.id}
                    className="bg-white rounded-2xl p-3.5 shadow-xs border border-slate-200/90 flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className="text-white rounded-xl px-3 py-2 text-center min-w-[68px] shrink-0 shadow-2xs"
                        style={{ backgroundColor: visual.hex }}
                      >
                        <span className="block text-[10px] uppercase text-white/90 font-bold">
                          {dateFormatted.split(',')[0]}
                        </span>
                        <span className="block text-sm font-extrabold">
                          {dateFormatted.split(',')[1]}
                        </span>
                      </div>

                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase text-white"
                            style={{ backgroundColor: visual.hex }}
                          >
                            {visual.label}
                          </span>
                          <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-[#5CA6CE]" />
                            {timeFormatted}
                          </span>
                        </div>

                        <h3 className="font-extrabold text-sm sm:text-base text-[#1E293B]">
                          {ev.title}
                        </h3>
                        {ev.location && (
                          <p className="text-xs text-slate-600 flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-[#5CA6CE]" />
                            {ev.location}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => deleteCalendarEvent(ev.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
