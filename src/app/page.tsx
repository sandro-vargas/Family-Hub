'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CloudSun,
  CalendarDays,
  Wind,
  ArrowRight,
  RefreshCw,
  Clock,
  MapPin,
  CheckSquare,
  Hand,
  Check,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useFamily } from '@/context/family-context';
import { CreatorBadge } from '@/components/creator-badge';
import { CalendarEvent, WeatherData } from '@/types/family';
import { MEMBER_TOCHTER_ID } from '@/lib/seed-data';

function getWeekDays(baseDate: Date, weekOffset: number): Date[] {
  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + weekOffset * 7);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

function toIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function AndroidHomeScreenPage() {
  const {
    household,
    members,
    activeMember,
    calendarEvents,
    todos,
    todoCategories,
    toggleTodoCompleted,
    claimTodo,
    syncWithGoogleCalendar,
    isSyncingGoogle,
    getMemberById,
  } = useFamily();

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [now, setNow] = useState<Date>(new Date());
  const [mounted, setMounted] = useState(false);

  // Weekly Calendar Filter State
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>('all');
  const [showAutoEvents, setShowAutoEvents] = useState<boolean>(false);
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    fetch('/api/weather')
      .then((r) => r.json())
      .then((data) => setWeather(data))
      .catch(() => null);

    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const weekDays = useMemo(() => getWeekDays(now, weekOffset), [now, weekOffset]);
  const todayIso = toIsoDate(now);

  // Filter events for the weekly overview:
  // Rule: Chiara (MEMBER_TOCHTER_ID) is ALWAYS included when filtering by Sandro or Jenni!
  const filteredEvents = useMemo(() => {
    return calendarEvents.filter((ev) => {
      const isAuto = ev.category === 'meal' || ev.category === 'todo' || ev.category === 'leisure';
      if (isAuto && !showAutoEvents) return false;

      if (selectedMemberFilter === 'all') return true;

      const includesSelected = ev.assigned_member_ids.includes(selectedMemberFilter);
      const includesChiara = ev.assigned_member_ids.includes(MEMBER_TOCHTER_ID);
      return includesSelected || includesChiara;
    });
  }, [calendarEvents, selectedMemberFilter, showAutoEvents]);

  // Event Color Rule:
  // - Auto-generated entries get dedicated colors
  // - Manual entries: if > 1 person affected -> Gray (#64748B), if 1 person -> member color_hex
  const getEventColor = (ev: CalendarEvent): string => {
    if (ev.category === 'meal') return '#74956C';
    if (ev.category === 'todo') return '#D97706';
    if (ev.category === 'leisure') return '#10B981';

    if (ev.assigned_member_ids.length > 1) {
      return '#64748B';
    }
    if (ev.assigned_member_ids.length === 1) {
      const member = getMemberById(ev.assigned_member_ids[0]);
      return member?.color_hex || '#5CA6CE';
    }
    return '#64748B';
  };

  const handleManualSync = async () => {
    const res = await syncWithGoogleCalendar();
    setSyncFeedback(res.message);
    setTimeout(() => setSyncFeedback(null), 4000);
  };

  const openTodos = useMemo(() => {
    const priorityWeight = { high: 3, normal: 2, low: 1 };
    return todos
      .filter((t) => !t.is_completed)
      .sort((a, b) => {
        const diff = priorityWeight[b.priority] - priorityWeight[a.priority];
        if (diff !== 0) return diff;
        if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
        if (a.due_date) return -1;
        if (b.due_date) return 1;
        return 0;
      });
  }, [todos]);

  const formattedDate = mounted
    ? new Intl.DateTimeFormat('de-CH', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
      }).format(now)
    : '';

  const formattedTime = mounted ? now.toTimeString().slice(0, 5) : '';

  return (
    <div className="space-y-4">
      {/* Compact Header Bar */}
      <div className="bg-white/85 backdrop-blur-md rounded-2xl px-4 py-2.5 shadow-xs border border-white flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#74956C] to-[#5CA6CE] text-white flex items-center justify-center font-extrabold text-xs shadow-xs">
            FH
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-extrabold text-[#1E293B]">
                {formattedDate} • {formattedTime} Uhr
              </h1>
              <span className="text-[11px] font-bold text-[#74956C] hidden sm:inline">
                ({household.weather_location_name})
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 bg-[#F4F7F5] px-3 py-1.5 rounded-xl border border-slate-200/80 text-xs">
            <CloudSun className="h-4 w-4 text-[#5CA6CE]" />
            <span className="font-extrabold text-[#1E293B]">
              {weather ? `${weather.temperature}°C` : '16°C'}
            </span>
            <span className="text-slate-500 hidden sm:inline">
              {weather?.conditionLabel || 'Grüt ZH'}
            </span>
            <span className="text-slate-400 hidden md:flex items-center gap-1">
              <Wind className="h-3 w-3 text-[#5CA6CE]" /> {weather?.windSpeed ?? 8} km/h
            </span>
          </div>
        </div>
      </div>

      {/* Main Weekly Calendar Overview (Wochenübersicht) */}
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-4 sm:p-5 shadow-md border border-white space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#5CA6CE] to-[#3B82A6] flex items-center justify-center text-white shadow-xs shrink-0">
                <CalendarDays className="h-4 w-4" />
              </span>
              <div>
                <h2 className="font-extrabold text-base sm:text-lg text-[#1E293B]">
                  Wochenübersicht Kalender
                </h2>
                <p className="text-[11px] text-slate-500">
                  Synchronisiert • Chiara wird bei allen Personenfiltern immer mit angezeigt
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 lg:hidden">
              <Link
                href="/calendar"
                className="px-2.5 py-1.5 rounded-xl bg-[#F4F7F5] text-xs font-bold text-[#2d7ba4] flex items-center gap-1"
              >
                Kalender <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Filter & Sync Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Person Filter Pills (Chiara always shown) */}
            <div className="flex items-center gap-1 bg-[#F4F7F5] p-1 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setSelectedMemberFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all ${
                  selectedMemberFilter === 'all'
                    ? 'bg-[#1E293B] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Alle
              </button>
              {members.map((m) => {
                const isSelected = selectedMemberFilter === m.id;
                const isChiara = m.id === MEMBER_TOCHTER_ID;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMemberFilter(m.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'text-white shadow-xs'
                        : 'text-slate-700 hover:bg-white/70'
                    }`}
                    style={isSelected ? { backgroundColor: m.color_hex } : undefined}
                    title={
                      isChiara
                        ? 'Nur Chiara anzeigen'
                        : `${m.display_name} + Chiara anzeigen`
                    }
                  >
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
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

            {/* Auto-generated events toggle (Default: hidden) */}
            <button
              type="button"
              onClick={() => setShowAutoEvents((prev) => !prev)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                showAutoEvents
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-[#F4F7F5] border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
              title="Automatisch generierte Einträge (Essen, ToDo, Ausflüge) ein-/ausblenden"
            >
              {showAutoEvents ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              <span>Auto-Einträge</span>
            </button>

            {/* Week Navigation */}
            <div className="flex items-center gap-1 bg-[#F4F7F5] p-1 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setWeekOffset((w) => w - 1)}
                className="p-1 rounded-lg hover:bg-white text-slate-700"
                title="Vorherige Woche"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setWeekOffset(0)}
                className="px-2 py-0.5 text-xs font-bold text-slate-700 hover:bg-white rounded-lg"
              >
                Heute
              </button>
              <button
                type="button"
                onClick={() => setWeekOffset((w) => w + 1)}
                className="p-1 rounded-lg hover:bg-white text-slate-700"
                title="Nächste Woche"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Sync Button */}
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncingGoogle}
              className="px-2.5 py-1.5 rounded-xl bg-[#5CA6CE]/15 hover:bg-[#5CA6CE] hover:text-white text-[#2d7ba4] text-xs font-bold transition-colors flex items-center gap-1"
              title="Mit Google Kalender synchronisieren"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncingGoogle ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sync</span>
            </button>

            <Link
              href="/calendar"
              className="hidden lg:flex px-3 py-1.5 rounded-xl bg-[#F4F7F5] hover:bg-[#5CA6CE] hover:text-white text-xs font-bold text-[#2d7ba4] transition-colors items-center gap-1"
            >
              Zum Kalender <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {syncFeedback && (
          <div className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
            ✓ {syncFeedback}
          </div>
        )}

        {/* 7-Day Grid */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-2.5">
          {weekDays.map((dayDate) => {
            const iso = toIsoDate(dayDate);
            const isToday = iso === todayIso;
            const dayName = new Intl.DateTimeFormat('de-CH', { weekday: 'short' }).format(dayDate);
            const dayNum = new Intl.DateTimeFormat('de-CH', {
              day: '2-digit',
              month: '2-digit',
            }).format(dayDate);

            const dayEvents = filteredEvents.filter((ev) => ev.start_at.slice(0, 10) === iso);

            return (
              <div
                key={iso}
                className={`rounded-2xl p-3 border flex flex-col justify-between min-h-[130px] transition-all ${
                  isToday
                    ? 'bg-[#5CA6CE]/8 border-[#5CA6CE] ring-1 ring-[#5CA6CE]/30'
                    : 'bg-[#F4F7F5]/70 border-slate-200/80'
                }`}
              >
                <div className="space-y-2">
                  {/* Day Header */}
                  <div className="flex items-center justify-between border-b border-slate-200/70 pb-1.5">
                    <span
                      className={`text-xs font-extrabold uppercase ${
                        isToday ? 'text-[#2d7ba4]' : 'text-slate-700'
                      }`}
                    >
                      {dayName}
                    </span>
                    <span
                      className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${
                        isToday ? 'bg-[#5CA6CE] text-white' : 'text-slate-500'
                      }`}
                    >
                      {dayNum}
                    </span>
                  </div>

                  {/* Day Events */}
                  {dayEvents.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic py-2">Keine Termine</p>
                  ) : (
                    <div className="space-y-1.5">
                      {dayEvents.map((ev) => {
                        const bgHex = getEventColor(ev);
                        const startD = new Date(ev.start_at);
                        const timeLabel = ev.is_all_day
                          ? 'Ganztägig'
                          : startD.toTimeString().slice(0, 5);
                        const assignedNames = ev.assigned_member_ids
                          .map((id) => getMemberById(id)?.display_name)
                          .filter(Boolean)
                          .join(', ');

                        return (
                          <Link
                            key={ev.id}
                            href="/calendar"
                            className="block p-2 rounded-xl text-white shadow-2xs hover:opacity-95 transition-opacity"
                            style={{ backgroundColor: bgHex }}
                          >
                            <div className="flex items-center justify-between gap-1 text-[10px] font-bold opacity-90">
                              <span className="flex items-center gap-1">
                                <Clock className="h-2.5 w-2.5 shrink-0" />
                                {timeLabel}
                              </span>
                              <span className="truncate max-w-[75px]">{assignedNames}</span>
                            </div>
                            <p className="font-extrabold text-xs leading-snug mt-0.5 line-clamp-2">
                              {ev.title}
                            </p>
                            {ev.location && (
                              <p className="text-[10px] opacity-85 truncate flex items-center gap-0.5 mt-0.5">
                                <MapPin className="h-2.5 w-2.5 shrink-0" /> {ev.location}
                              </p>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Color Legend */}
        <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-600">
          <span className="font-bold text-slate-500">Farbcode:</span>
          {members.map((m) => (
            <span key={m.id} className="inline-flex items-center gap-1 font-semibold">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: m.color_hex }} />
              {m.display_name}
            </span>
          ))}
          <span className="inline-flex items-center gap-1 font-semibold">
            <span className="h-2.5 w-2.5 rounded-full bg-[#64748B]" />
            Mehrere Personen (Grau)
          </span>
          {showAutoEvents && (
            <>
              <span className="inline-flex items-center gap-1 font-semibold">
                <span className="h-2.5 w-2.5 rounded-full bg-[#74956C]" />
                Essen
              </span>
              <span className="inline-flex items-center gap-1 font-semibold">
                <span className="h-2.5 w-2.5 rounded-full bg-[#D97706]" />
                ToDo
              </span>
              <span className="inline-flex items-center gap-1 font-semibold">
                <span className="h-2.5 w-2.5 rounded-full bg-[#10B981]" />
                Ausflug
              </span>
            </>
          )}
        </div>
      </div>

      {/* Compact Open Family ToDos Card */}
      {openTodos.length > 0 && (
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-4 shadow-sm border border-white space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-amber-600" />
              <h2 className="font-extrabold text-sm text-[#1E293B]">
                Aktuelle ToDos ({openTodos.length} offen)
              </h2>
            </div>
            <Link
              href="/todos"
              className="text-xs font-bold text-[#2d7ba4] hover:underline flex items-center gap-1"
            >
              Alle ToDos <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {openTodos.slice(0, 4).map((todo) => {
              const cat = todoCategories.find((c) => c.slug === todo.category_slug);
              return (
                <div
                  key={todo.id}
                  className="p-2.5 rounded-2xl bg-[#F4F7F5] border border-slate-200/80 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleTodoCompleted(todo.id)}
                      className="h-5 w-5 rounded-md border-2 border-amber-600 bg-white hover:bg-amber-100 flex items-center justify-center shrink-0"
                      title="ToDo direkt erledigen"
                    >
                      <Check className="h-3 w-3 text-amber-700 opacity-0 hover:opacity-100" />
                    </button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold text-white uppercase"
                          style={{ backgroundColor: cat?.color_hex || '#EAB308' }}
                        >
                          {cat?.name || 'ToDo'}
                        </span>
                        {todo.due_date && (
                          <span className="text-[10px] font-bold text-slate-600">
                            Fällig: {todo.due_date.slice(8, 10)}.{todo.due_date.slice(5, 7)}.
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-xs text-[#1E293B] truncate">{todo.title}</p>
                    </div>
                  </div>

                  {todo.assigned_member_id ? (
                    <CreatorBadge memberId={todo.assigned_member_id} showName={false} />
                  ) : activeMember.role === 'adult' ? (
                    <button
                      type="button"
                      onClick={() => claimTodo(todo.id, activeMember.id)}
                      className="px-2 py-1 rounded-xl bg-[#5CA6CE] hover:bg-[#488eb5] text-white text-[10px] font-extrabold flex items-center gap-1 shrink-0"
                    >
                      <Hand className="h-3 w-3" /> Übernehmen
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
