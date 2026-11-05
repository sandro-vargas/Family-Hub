'use client';

import React, { useState } from 'react';
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
  UtensilsCrossed,
  CheckSquare,
  Compass,
} from 'lucide-react';
import { useFamily } from '@/context/family-context';
import { CreatorBadge } from '@/components/creator-badge';
import { EventCategory } from '@/types/family';

const CATEGORY_STYLES: Record<EventCategory, { label: string; bg: string; text: string; dot: string }> = {
  family: { label: 'Familie', bg: 'bg-[#74956C]/15', text: 'text-[#4d6847]', dot: '#74956C' },
  child: { label: 'Chiara / Kita', bg: 'bg-amber-100', text: 'text-amber-800', dot: '#EAB308' },
  medical: { label: 'Arzt / Gesundheit', bg: 'bg-[#5CA6CE]/15', text: 'text-[#2d7ba4]', dot: '#5CA6CE' },
  birthday: { label: 'Geburtstag', bg: 'bg-purple-100', text: 'text-purple-800', dot: '#A855F7' },
  meal: { label: 'Essen', bg: 'bg-emerald-100', text: 'text-emerald-800', dot: '#10B981' },
  todo: { label: 'ToDo-Deadline', bg: 'bg-rose-100', text: 'text-rose-800', dot: '#F43F5E' },
  leisure: { label: 'Ausflug / Freizeit', bg: 'bg-sky-100', text: 'text-sky-800', dot: '#0EA5E9' },
  other: { label: 'Sonstiges', bg: 'bg-slate-100', text: 'text-slate-700', dot: '#64748B' },
};

const WEEKDAY_NAMES = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export default function CalendarPage() {
  const {
    calendarEvents,
    addCalendarEvent,
    deleteCalendarEvent,
    members,
    isSyncingGoogle,
    syncWithGoogleCalendar,
    googleSyncConfig,
  } = useFamily();

  const today = new Date();
  const todayIso = today.toISOString().split('T')[0];

  // Calendar View State: Month navigation + Selected Day
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0-11
  const [selectedDayIso, setSelectedDayIso] = useState<string>(todayIso);
  const [viewMode, setViewMode] = useState<'calendar' | 'agenda'>('calendar');

  // New Event Form State
  const [title, setTitle] = useState('');
  const [dateStr, setDateStr] = useState(todayIso);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [isAllDay, setIsAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<EventCategory>('family');
  const [assignedIds, setAssignedIds] = useState<string[]>([members[0]?.id || '']);

  // Filters
  const [filterMemberId, setFilterMemberId] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<EventCategory | 'all'>('all');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const toggleMemberAssignment = (id: string) => {
    setAssignedIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
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
    setSelectedDayIso(now.toISOString().split('T')[0]);
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
      category,
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

  const visibleEvents = calendarEvents.filter((ev) => {
    if (filterMemberId !== 'all' && !ev.assigned_member_ids.includes(filterMemberId)) {
      return false;
    }
    if (filterCategory !== 'all' && ev.category !== filterCategory) {
      return false;
    }
    return true;
  });

  // Build Month Grid matrix
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  // Monday as first day of week: (0 is Sunday -> 6, 1 is Monday -> 0)
  const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;

  // Previous month trailing days
  const prevMonthDaysCount = new Date(currentYear, currentMonth, 0).getDate();
  const calendarCells: {
    iso: string;
    dayNum: number;
    isCurrentMonth: boolean;
    isToday: boolean;
  }[] = [];

  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthDaysCount - i;
    const prevMonthDate = new Date(currentYear, currentMonth - 1, dayNum);
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

  // Next month leading days to complete full weeks
  const remainingCells = (7 - (calendarCells.length % 7)) % 7;
  for (let n = 1; n <= remainingCells; n++) {
    const nextDate = new Date(currentYear, currentMonth + 1, n);
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

  // Selected Day Details
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
    <div className="space-y-6">
      {syncMessage && (
        <div className="bg-[#74956C] text-white px-4 py-3 rounded-2xl shadow-sm flex items-center justify-between text-xs sm:text-sm font-bold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>{syncMessage}</span>
          </div>
          <Link
            href="/settings"
            className="px-3 py-1 rounded-lg bg-white text-[#74956C] text-xs font-extrabold shrink-0"
          >
            Sync-Einstellungen
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/90 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#74956C]/15 text-[#74956C]">
              MONATSÜBERSICHT • ESSEN • TODOD-DEADLINES • GOOGLE SYNC
            </span>
            <h1 className="text-2xl font-extrabold text-[#1E293B] mt-1 flex items-center gap-2">
              <CalendarDays className="h-6 w-6 text-[#5CA6CE]" />
              Familienkalender
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Switcher: Monatskalender vs. Agenda-Liste */}
            <div className="bg-[#F4F7F5] p-1 rounded-xl border border-slate-200 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  viewMode === 'calendar'
                    ? 'bg-[#74956C] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarIcon className="h-3.5 w-3.5" />
                Kalenderansicht
              </button>
              <button
                type="button"
                onClick={() => setViewMode('agenda')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  viewMode === 'agenda'
                    ? 'bg-[#74956C] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="h-3.5 w-3.5" />
                Listenansicht
              </button>
            </div>

            <button
              type="button"
              onClick={handleTriggerGoogleSync}
              disabled={isSyncingGoogle}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#5CA6CE] hover:bg-[#488eb5] disabled:opacity-60 text-white text-xs font-bold shadow-xs transition-all"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncingGoogle ? 'animate-spin' : ''}`} />
              {isSyncingGoogle ? 'Sync...' : 'Google Sync'}
            </button>
          </div>
        </div>

        {/* Filter Row 1: By Member & Filter Row 2: By Category */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5 bg-[#F4F7F5] p-1.5 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setFilterMemberId('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                filterMemberId === 'all' ? 'bg-[#74956C] text-white' : 'text-slate-600'
              }`}
            >
              Alle Personen
            </button>
            {members
              .filter((m) => m.role !== 'kiosk')
              .map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setFilterMemberId(m.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                    filterMemberId === m.id
                      ? 'bg-white shadow-2xs text-[#1E293B]'
                      : 'text-slate-600'
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: m.color_hex }}
                  />
                  {m.display_name}
                </button>
              ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { key: 'all', label: 'Alle Kategorien' },
                { key: 'meal', label: '🍽️ Essen' },
                { key: 'todo', label: '📌 ToDos' },
                { key: 'leisure', label: '🏔️ Ausflüge' },
                { key: 'family', label: 'Familie' },
                { key: 'child', label: 'Chiara' },
                { key: 'medical', label: 'Arzt' },
              ] as { key: EventCategory | 'all'; label: string }[]
            ).map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setFilterCategory(c.key)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                  filterCategory === c.key
                    ? 'bg-[#1E293B] text-white border-[#1E293B]'
                    : 'bg-[#F4F7F5] text-slate-600 border-slate-200 hover:bg-slate-200/70'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 4 Columns: New Event Form */}
        <form
          onSubmit={handleAddEvent}
          className="lg:col-span-4 bg-white p-5 rounded-2xl shadow-xs border border-slate-200/90 space-y-4 h-fit"
        >
          <h2 className="font-bold text-base text-[#1E293B] flex items-center gap-2">
            <Plus className="h-5 w-5 text-[#74956C]" />
            Neuen Familientermin eintragen
          </h2>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Termin-Titel</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Kinderarzt, Elternabend, Ausflug..."
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#1E293B] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#74956C]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Datum</label>
              <input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-[#1E293B]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Kategorie</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as EventCategory)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-[#1E293B] bg-white font-bold"
              >
                <option value="family">Familie</option>
                <option value="child">Chiara / Kita</option>
                <option value="medical">Arzt / Gesundheit</option>
                <option value="meal">Essen</option>
                <option value="leisure">Ausflug / Freizeit</option>
                <option value="todo">ToDo-Deadline</option>
                <option value="birthday">Geburtstag</option>
                <option value="other">Sonstiges</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between bg-[#F4F7F5] px-3.5 py-2 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-700">Ganztägiger Termin</span>
            <input
              type="checkbox"
              checked={isAllDay}
              onChange={(e) => setIsAllDay(e.target.checked)}
              className="h-4 w-4 accent-[#74956C]"
            />
          </div>

          {!isAllDay && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Von</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-[#1E293B]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Bis</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-[#1E293B]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1.5 flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-[#74956C]" />
              Wer ist betroffen?
            </label>
            <div className="flex flex-wrap gap-2">
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
                          ? 'bg-[#74956C] text-white border-[#74956C]'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: member.color_hex }}
                      />
                      {member.display_name}
                    </button>
                  );
                })}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Ort (optional)</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="z.B. Grüt, Wetzikon, Hinwil..."
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-[#1E293B] placeholder:text-slate-400"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-[#74956C] hover:bg-[#618059] text-white font-bold text-sm shadow-xs transition-colors"
          >
            Termin im Kalender speichern
          </button>

          {/* Quick Links */}
          <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-500">
            <p className="font-bold text-slate-700">Automatische Kalender-Einträge:</p>
            <div className="flex flex-wrap gap-1.5">
              <Link
                href="/meals"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 font-bold hover:underline"
              >
                <UtensilsCrossed className="h-3 w-3" /> Essensplan
              </Link>
              <Link
                href="/todos"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-50 text-rose-800 font-bold hover:underline"
              >
                <CheckSquare className="h-3 w-3" /> ToDo-Deadlines
              </Link>
              <Link
                href="/leisure"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-50 text-sky-800 font-bold hover:underline"
              >
                <Compass className="h-3 w-3" /> Freizeit ZH
              </Link>
            </div>
          </div>
        </form>

        {/* Right 8 Columns: INTERACTIVE CALENDAR VIEW OR LIST AGENDA */}
        <div className="lg:col-span-8 space-y-4">
          {viewMode === 'calendar' ? (
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
              {/* Month Navigation Toolbar */}
              <div className="p-4 sm:p-5 border-b border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F4F7F5]/50">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg sm:text-xl font-extrabold text-[#1E293B] capitalize">
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

                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors"
                    title="Vorheriger Monat"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors"
                    title="Nächster Monat"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Weekday Header */}
              <div className="grid grid-cols-7 border-b border-slate-200 bg-[#F4F7F5] text-center text-xs font-extrabold text-slate-600 py-2.5">
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

                      {/* Event Indicator Pills / Dots */}
                      <div className="space-y-1 mt-1 overflow-hidden">
                        {dayEvents.slice(0, 2).map((ev) => {
                          const catMeta = CATEGORY_STYLES[ev.category] || CATEGORY_STYLES.family;
                          return (
                            <div
                              key={ev.id}
                              className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold truncate leading-tight hidden sm:flex items-center gap-1 ${catMeta.bg} ${catMeta.text}`}
                              title={ev.title}
                            >
                              <span
                                className="h-1.5 w-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: catMeta.dot }}
                              />
                              <span className="truncate">{ev.title}</span>
                            </div>
                          );
                        })}

                        {/* Mobile Dot Row */}
                        <div className="flex sm:hidden items-center justify-center gap-1 pt-1">
                          {dayEvents.slice(0, 3).map((ev) => {
                            const catMeta =
                              CATEGORY_STYLES[ev.category] || CATEGORY_STYLES.family;
                            return (
                              <span
                                key={ev.id}
                                className="h-1.5 w-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: catMeta.dot }}
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
              <div className="p-4 sm:p-5 border-t border-slate-200 bg-[#F4F7F5]/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#74956C]">
                      DETAILS FÜR DEN AUSGEWÄHLTEN TAG
                    </span>
                    <h3 className="text-base font-extrabold text-[#1E293B]">
                      {selectedDayLabel} ({selectedDayEvents.length} Termine)
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setDateStr(selectedDayIso);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-[#74956C] hover:text-white text-xs font-bold text-slate-700 transition-colors shadow-2xs flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Termin für diesen Tag
                  </button>
                </div>

                {selectedDayEvents.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2">
                    Keine Termine für diesen Tag eingetragen. Klicke auf „+ Termin für diesen Tag“, um einen Eintrag zu erfassen.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {selectedDayEvents.map((ev) => {
                      const d = new Date(ev.start_at);
                      const endD = new Date(ev.end_at);
                      const timeFormatted = ev.is_all_day
                        ? 'Ganztägig'
                        : `${d.toTimeString().slice(0, 5)} – ${endD.toTimeString().slice(0, 5)} Uhr`;
                      const catStyle = CATEGORY_STYLES[ev.category] || CATEGORY_STYLES.family;

                      return (
                        <div
                          key={ev.id}
                          className="bg-white rounded-xl p-3.5 shadow-2xs border border-slate-200/90 flex items-start justify-between gap-3"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${catStyle.bg} ${catStyle.text}`}
                              >
                                {catStyle.label}
                              </span>
                              <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5 text-[#5CA6CE]" />
                                {timeFormatted}
                              </span>
                              {ev.sync_status === 'synced' && (
                                <span className="text-[10px] font-bold text-[#74956C]">
                                  Google Sync ✓
                                </span>
                              )}
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

                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              <span className="text-[11px] text-slate-400">Betrifft:</span>
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
            /* Fallback Agenda List View */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-base text-[#1E293B]">
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
                const catStyle = CATEGORY_STYLES[ev.category] || CATEGORY_STYLES.family;

                return (
                  <div
                    key={ev.id}
                    className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/90 flex items-start justify-between gap-4"
                  >
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="bg-gradient-to-br from-[#74956C] to-[#5CA6CE] text-white rounded-2xl px-3.5 py-2.5 text-center min-w-[76px] shrink-0 shadow-2xs">
                        <span className="block text-[11px] uppercase text-white/90 font-bold">
                          {dateFormatted.split(',')[0]}
                        </span>
                        <span className="block text-base font-extrabold">
                          {dateFormatted.split(',')[1]}
                        </span>
                      </div>

                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${catStyle.bg} ${catStyle.text}`}
                          >
                            {catStyle.label}
                          </span>
                          <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-[#5CA6CE]" />
                            {timeFormatted}
                          </span>
                        </div>

                        <h3 className="font-extrabold text-base text-[#1E293B]">{ev.title}</h3>
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
                      className="p-2 text-slate-400 hover:text-red-600 rounded-lg shrink-0"
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
