'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Compass,
  Sparkles,
  MapPin,
  Car,
  ExternalLink,
  CalendarPlus,
  Sun,
  CloudRain,
  CheckCircle2,
  Baby,
  Globe,
  CalendarCheck2,
  CloudSun,
  RefreshCw,
} from 'lucide-react';
import { useFamily } from '@/context/family-context';
import { VoiceInputButton } from '@/components/voice-input-button';
import { ZURICH_OBERLAND_EVENT_PORTALS } from '@/lib/seed-data';
import { LeisureCategory } from '@/types/family';
import type { CrawledRegionalEvent } from '@/app/api/leisure/events/route';

const CATEGORY_LABELS: Record<LeisureCategory | 'all', string> = {
  all: 'Alle Erlebnisse',
  animals_nature: '🐐 Tiere & Bauernhof',
  outdoor: '🏔️ Berge & Spielplätze',
  water_lake: '🌊 See & Naturwege',
  indoor: '🌧️ Indoor & Schlechtwetter',
  culture_events: '🎪 Lokale Events',
};

function getNextSaturdayIso(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = (6 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

interface DailyWeatherForecastItem {
  date: string;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
  conditionLabel: string;
  precipProbability: number;
  recommendedWeatherMode: 'sun' | 'rain';
}

export default function LeisurePage() {
  const { leisureActivities, addCalendarEvent, members } = useFamily();

  const [aiQuery, setAiQuery] = useState('');
  const [weatherMode, setWeatherMode] = useState<'any' | 'sun' | 'rain'>('any');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);

  // Weekly Weather & Season State
  const [seasonLabel, setSeasonLabel] = useState<string>('Herbst');
  const [seasonId, setSeasonId] = useState<'spring' | 'summer' | 'autumn' | 'winter'>('autumn');
  const [dailyForecast, setDailyForecast] = useState<DailyWeatherForecastItem[]>([]);

  // Crawled Regional Portal Events State
  const [crawledEvents, setCrawledEvents] = useState<CrawledRegionalEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(true);
  const [selectedPortalFilter, setSelectedPortalFilter] = useState<string>('all');

  // Calendar Scheduling State
  const [plannedDate, setPlannedDate] = useState<string>(getNextSaturdayIso());
  const [startTime, setStartTime] = useState<string>('10:00');
  const [endTime, setEndTime] = useState<string>('15:00');
  const [addedBanner, setAddedBanner] = useState<string | null>(null);

  // Filter State for Curated Activities
  const [selectedCategory, setSelectedCategory] = useState<LeisureCategory | 'all'>('all');
  const [maxMinutes, setMaxMinutes] = useState<number>(30);

  const familyMemberIds = members.filter((m) => m.role !== 'kiosk').map((m) => m.id);

  // Load 7-day weather & season + crawled events on mount
  useEffect(() => {
    fetch('/api/weather')
      .then((r) => r.json())
      .then((data) => {
        if (data.seasonLabel) setSeasonLabel(data.seasonLabel);
        if (data.season) setSeasonId(data.season);
        if (Array.isArray(data.dailyForecast) && data.dailyForecast.length > 0) {
          setDailyForecast(data.dailyForecast);
          // Match plannedDate or today to auto-adapt weather mode
          const matchingDay =
            data.dailyForecast.find((d: DailyWeatherForecastItem) => d.date === plannedDate) ||
            data.dailyForecast[0];
          if (matchingDay?.recommendedWeatherMode) {
            setWeatherMode(matchingDay.recommendedWeatherMode);
          }
        }
      })
      .catch(() => null);

    fetch('/api/leisure/events')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.events)) {
          setCrawledEvents(data.events);
        }
      })
      .catch(() => null)
      .finally(() => setIsLoadingEvents(false));
  }, []);

  const refreshCrawledEvents = () => {
    setIsLoadingEvents(true);
    fetch('/api/leisure/events')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.events)) {
          setCrawledEvents(data.events);
        }
      })
      .finally(() => setIsLoadingEvents(false));
  };

  // When user picks a day in the weekly weather bar, set plannedDate & adapt weatherMode
  const handleSelectWeatherDay = (day: DailyWeatherForecastItem) => {
    setPlannedDate(day.date);
    setWeatherMode(day.recommendedWeatherMode);
  };

  const weeklyWeatherSummary = useMemo(() => {
    if (dailyForecast.length === 0) return `${seasonLabel}, mild`;
    return dailyForecast
      .slice(0, 5)
      .map((d) => `${d.date.slice(8, 10)}.${d.date.slice(5, 7)}.: ${d.conditionLabel} (${d.tempMax}°C)`)
      .join(', ');
  }, [dailyForecast, seasonLabel]);

  const handleAskGeminiLeisure = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      const response = await fetch('/api/ai/leisure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt:
            aiQuery.trim() ||
            (weatherMode === 'rain'
              ? `Schlechtwetter-Ausflug (${seasonLabel}) mit Kleinkind im Zürcher Oberland`
              : `Schöner Familienausflug im ${seasonLabel} im Zürcher Oberland (max. 30 Min. ab Grüt ZH)`),
          weatherFilter: weatherMode,
          seasonLabel,
          weeklyWeatherSummary,
        }),
      });
      const data = await response.json();
      setAiSuggestions(data.suggestions || []);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddActivityToCalendar = (item: {
    title: string;
    municipality: string;
    drive_minutes_from_gruet: number;
    description: string;
    tip?: string;
    event_url: string;
    suggested_start_time?: string;
    suggested_end_time?: string;
  }) => {
    const startH = item.suggested_start_time || startTime;
    const endH = item.suggested_end_time || endTime;

    const startIso = new Date(`${plannedDate}T${startH}:00`).toISOString();
    const endIso = new Date(`${plannedDate}T${endH}:00`).toISOString();

    addCalendarEvent({
      title: `🏔️ Ausflug: ${item.title}`,
      description: `${item.description}${
        item.tip ? ` • Tipp: ${item.tip}` : ''
      } (Fahrzeit ab Grüt ZH: ca. ${item.drive_minutes_from_gruet} Min.)`,
      location: `${item.municipality} (ca. ${item.drive_minutes_from_gruet} Min. ab 8624 Grüt)`,
      start_at: startIso,
      end_at: endIso,
      is_all_day: false,
      assigned_member_ids: familyMemberIds,
      category: 'leisure',
      external_url: item.event_url,
    });

    setAddedBanner(
      `„${item.title}“ wurde für den ${plannedDate} (${startH}–${endH} Uhr) im Familienkalender eingetragen!`
    );
    setTimeout(() => setAddedBanner(null), 6000);
  };

  // Filter Crawled Events by Portal, Weather & Season
  const visibleCrawledEvents = useMemo(() => {
    return crawledEvents.filter((ev) => {
      if (selectedPortalFilter !== 'all' && !ev.portalName.includes(selectedPortalFilter)) {
        return false;
      }
      if (
        weatherMode === 'rain' &&
        ev.weatherSuitability !== 'rain' &&
        ev.weatherSuitability !== 'any'
      ) {
        return false;
      }
      if (
        weatherMode === 'sun' &&
        ev.weatherSuitability !== 'sun' &&
        ev.weatherSuitability !== 'any'
      ) {
        return false;
      }
      if (
        ev.seasonSuitability &&
        ev.seasonSuitability.length > 0 &&
        !ev.seasonSuitability.includes(seasonId)
      ) {
        return false;
      }
      return true;
    });
  }, [crawledEvents, selectedPortalFilter, weatherMode, seasonId]);

  // Filter & Sort Curated Activities adapted to current week's weather & season
  const filteredActivities = useMemo(() => {
    return leisureActivities
      .filter((act) => {
        if (act.drive_minutes_from_gruet > maxMinutes) return false;
        if (selectedCategory !== 'all' && act.category !== selectedCategory) return false;
        if (
          weatherMode === 'rain' &&
          act.weather_suitability !== 'rain' &&
          act.weather_suitability !== 'any'
        ) {
          return false;
        }
        if (
          weatherMode === 'sun' &&
          act.weather_suitability !== 'sun' &&
          act.weather_suitability !== 'any'
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Prioritize exact weather match first
        if (weatherMode !== 'any') {
          const aExact = a.weather_suitability === weatherMode ? 1 : 0;
          const bExact = b.weather_suitability === weatherMode ? 1 : 0;
          if (aExact !== bExact) return bExact - aExact;
        }
        return a.drive_minutes_from_gruet - b.drive_minutes_from_gruet;
      });
  }, [leisureActivities, maxMinutes, selectedCategory, weatherMode]);

  return (
    <div className="space-y-4">
      {addedBanner && (
        <div className="bg-[#74956C] text-white px-4 py-2.5 rounded-2xl shadow-sm flex items-center justify-between text-xs sm:text-sm font-bold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{addedBanner}</span>
          </div>
          <Link
            href="/calendar"
            className="px-2.5 py-1 rounded-lg bg-white text-[#74956C] text-xs font-extrabold shrink-0"
          >
            Zum Kalender →
          </Link>
        </div>
      )}

      {/* Compact Page Header */}
      <div className="bg-white px-4 py-2.5 rounded-2xl shadow-xs border border-slate-200/90 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Compass className="h-5 w-5 text-[#74956C]" />
          <h1 className="text-base sm:text-lg font-extrabold text-[#1E293B]">
            Freizeit & Events Zürcher Oberland
          </h1>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#74956C]/15 text-[#4d6847]">
            Saison: {seasonLabel} • ≤ 30 Min. ab Grüt
          </span>
        </div>

        <Link
          href="/calendar"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F4F7F5] hover:bg-[#5CA6CE] hover:text-white text-xs font-bold text-[#2d7ba4] transition-colors"
        >
          <CalendarCheck2 className="h-3.5 w-3.5" />
          Im Kalender
        </Link>
      </div>

      {/* 1. Weekly Weather & Season Adaptation Bar (Klick auf Tag passt Vorschläge direkt ans Wetter an) */}
      {dailyForecast.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/90 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CloudSun className="h-4 w-4 text-[#5CA6CE]" />
              <h2 className="font-extrabold text-xs sm:text-sm text-[#1E293B]">
                Wochenwetter 8624 Grüt ZH & Saison-Anpassung ({seasonLabel})
              </h2>
            </div>
            <span className="text-[11px] text-slate-500">
              Wähle einen Tag – Vorschläge & Events passen sich automatisch der Witterung an
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
            {dailyForecast.map((day) => {
              const isSelected = plannedDate === day.date;
              const dObj = new Date(`${day.date}T12:00:00`);
              const weekday = new Intl.DateTimeFormat('de-CH', { weekday: 'short' }).format(dObj);
              const dateShort = `${day.date.slice(8, 10)}.${day.date.slice(5, 7)}.`;
              const isRain = day.recommendedWeatherMode === 'rain';

              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => handleSelectWeatherDay(day)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-1 ${
                    isSelected
                      ? 'bg-[#5CA6CE]/12 border-[#5CA6CE] ring-1 ring-[#5CA6CE]'
                      : 'bg-[#F4F7F5] border-slate-200/80 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-extrabold text-[#1E293B]">{weekday}</span>
                    <span className="text-[10px] text-slate-500">{dateShort}</span>
                  </div>
                  <div className="flex items-center justify-between w-full pt-0.5">
                    <span className="text-xs font-extrabold text-[#1E293B]">
                      {day.tempMax}° / {day.tempMin}°
                    </span>
                    {isRain ? (
                      <CloudRain className="h-3.5 w-3.5 text-[#5CA6CE]" />
                    ) : (
                      <Sun className="h-3.5 w-3.5 text-amber-500" />
                    )}
                  </div>
                  <span className="text-[10px] font-semibold text-slate-600 truncate w-full">
                    {day.conditionLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Crawled Regional Events with Direct Source URL Links */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/90 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#5CA6CE]/15 text-[#2d7ba4]">
                GECRAWLTE VERANSTALTUNGEN AUS DEN PORTALEN
              </span>
            </div>
            <h2 className="font-extrabold text-sm sm:text-base text-[#1E293B] mt-1 flex items-center gap-2">
              <Globe className="h-4 w-4 text-[#5CA6CE]" />
              Aktuelle Ereignisse in der Region (inkl. Direktlink zur Fundstelle)
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedPortalFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                selectedPortalFilter === 'all'
                  ? 'bg-[#1E293B] text-white'
                  : 'bg-[#F4F7F5] text-slate-600'
              }`}
            >
              Alle Portale ({visibleCrawledEvents.length})
            </button>
            {['Zürioberland', 'Jucker Farm', 'Wetzikon', 'Uster'].map((pName) => (
              <button
                key={pName}
                type="button"
                onClick={() => setSelectedPortalFilter(pName)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                  selectedPortalFilter === pName
                    ? 'bg-[#5CA6CE] text-white'
                    : 'bg-[#F4F7F5] text-slate-600'
                }`}
              >
                {pName}
              </button>
            ))}
            <button
              type="button"
              onClick={refreshCrawledEvents}
              className="p-1.5 rounded-lg bg-[#F4F7F5] hover:bg-slate-200 text-slate-700"
              title="Events neu crawlen"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoadingEvents ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* List of Crawled Events with Direct Source URL */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {visibleCrawledEvents.map((ev) => (
            <div
              key={ev.id}
              className="p-3.5 rounded-2xl bg-[#F4F7F5] border border-slate-200/90 flex flex-col justify-between gap-2.5"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-white text-[#2d7ba4] border border-slate-200">
                    Quelle: {ev.portalName}
                  </span>
                  <span className="text-[11px] font-bold text-[#74956C] flex items-center gap-1">
                    <Car className="h-3 w-3" /> {ev.driveMinutesFromGruet} Min. • {ev.location}
                  </span>
                </div>

                <h3 className="font-extrabold text-sm text-[#1E293B]">{ev.title}</h3>
                <p className="text-[11px] font-semibold text-amber-800">{ev.dateLabel}</p>
                <p className="text-xs text-slate-600 leading-relaxed">{ev.description}</p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/70">
                <a
                  href={ev.foundAtUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-extrabold text-[#5CA6CE] hover:underline truncate max-w-[230px]"
                  title={ev.foundAtUrl}
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  <span>Gefunden auf: {new URL(ev.foundAtUrl).hostname.replace(/^www\./, '')}</span>
                </a>

                <button
                  type="button"
                  onClick={() =>
                    handleAddActivityToCalendar({
                      title: ev.title,
                      municipality: ev.location,
                      drive_minutes_from_gruet: ev.driveMinutesFromGruet,
                      description: ev.description,
                      event_url: ev.foundAtUrl,
                    })
                  }
                  className="px-2.5 py-1.5 rounded-xl bg-[#74956C] hover:bg-[#618059] text-white text-xs font-bold flex items-center gap-1 shrink-0"
                >
                  <CalendarPlus className="h-3.5 w-3.5" />
                  In Kalender ({plannedDate.slice(8, 10)}.{plannedDate.slice(5, 7)}.)
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Portal Overview Links */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-slate-500">Alle Eventportale direkt öffnen:</span>
          {ZURICH_OBERLAND_EVENT_PORTALS.map((portal) => (
            <a
              key={portal.id}
              href={portal.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F4F7F5] hover:bg-[#5CA6CE]/15 text-[#2d7ba4] font-bold border border-slate-200"
            >
              <span>{portal.title}</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          ))}
        </div>
      </div>

      {/* 3. Gemini AI Leisure Planner */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/90 space-y-3">
        <form onSubmit={handleAskGeminiLeisure} className="space-y-3">
          <div className="flex flex-col md:flex-row gap-2.5">
            <div className="flex-1 flex items-center gap-2">
              <input
                type="text"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                placeholder={`KI-Ausflugssuche für ${seasonLabel} (z.B. "Tiere füttern", "Indoor bei Regen" oder Event-URL)...`}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-[#1E293B] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5CA6CE]"
              />
              <VoiceInputButton onTranscript={(t) => setAiQuery(t)} />
            </div>

            <button
              type="submit"
              disabled={isGenerating}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#5CA6CE] hover:bg-[#488eb5] text-white font-bold text-xs sm:text-sm shadow-xs transition-all shrink-0"
            >
              <Sparkles className="h-4 w-4" />
              {isGenerating ? 'Suche läuft...' : 'KI-Vorschläge passend zu Wetter & Saison'}
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 bg-[#F4F7F5] px-3 py-2 rounded-xl border border-slate-200">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-600">Witterungs-Filter:</span>
              <button
                type="button"
                onClick={() => setWeatherMode('any')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                  weatherMode === 'any' ? 'bg-[#74956C] text-white' : 'bg-white text-slate-600'
                }`}
              >
                Alle
              </button>
              <button
                type="button"
                onClick={() => setWeatherMode('sun')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${
                  weatherMode === 'sun' ? 'bg-amber-500 text-white' : 'bg-white text-slate-600'
                }`}
              >
                <Sun className="h-3.5 w-3.5" /> Trocken / Sonne
              </button>
              <button
                type="button"
                onClick={() => setWeatherMode('rain')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${
                  weatherMode === 'rain' ? 'bg-[#5CA6CE] text-white' : 'bg-white text-slate-600'
                }`}
              >
                <CloudRain className="h-3.5 w-3.5" /> Regen / Indoor
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-[#1E293B]">Geplanter Tag:</span>
              <input
                type="date"
                value={plannedDate}
                onChange={(e) => setPlannedDate(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-[#1E293B]"
              />
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-[#1E293B]"
              />
              <span>–</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-[#1E293B]"
              />
            </div>
          </div>
        </form>

        {/* Gemini Suggestions Output */}
        {aiSuggestions.length > 0 && (
          <div className="space-y-2.5 border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-xs sm:text-sm text-[#1E293B] flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-[#5CA6CE]" />
                KI-Empfehlungen für {seasonLabel} & aktuelle Witterung
              </h3>
              <button
                type="button"
                onClick={() => setAiSuggestions([])}
                className="text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                Schliessen
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {aiSuggestions.map((sug, i) => (
                <div
                  key={i}
                  className="bg-[#F4F7F5] rounded-2xl p-3.5 border border-[#5CA6CE]/40 flex flex-col justify-between space-y-2.5"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#74956C]/15 text-[#4d6847] flex items-center gap-1">
                        <Car className="h-3 w-3" /> {sug.drive_minutes_from_gruet} Min. ab Grüt
                      </span>
                      <span className="text-[11px] font-bold text-slate-500">
                        {sug.municipality}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-sm text-[#1E293B]">{sug.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{sug.description}</p>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-200/70">
                    <a
                      href={sug.event_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#5CA6CE] hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Quelle / Webseite öffnen
                    </a>

                    <button
                      type="button"
                      onClick={() => handleAddActivityToCalendar(sug)}
                      className="w-full py-1.5 px-3 rounded-xl bg-[#74956C] hover:bg-[#618059] text-white text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <CalendarPlus className="h-3.5 w-3.5" />
                      In Kalender eintragen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. Curated Family Destinations adapted to Weather & Drive Time */}
      <div className="space-y-3">
        <div className="bg-white p-3.5 rounded-2xl shadow-xs border border-slate-200/90 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-1">
            {(Object.keys(CATEGORY_LABELS) as (LeisureCategory | 'all')[]).map((catKey) => (
              <button
                key={catKey}
                type="button"
                onClick={() => setSelectedCategory(catKey)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-colors ${
                  selectedCategory === catKey
                    ? 'bg-[#74956C] text-white shadow-2xs'
                    : 'bg-[#F4F7F5] text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                {CATEGORY_LABELS[catKey]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <Car className="h-3.5 w-3.5 text-[#74956C]" />
              Max. Fahrzeit:
            </span>
            {[15, 20, 30].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMaxMinutes(m)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                  maxMinutes === m
                    ? 'bg-[#1E293B] text-white'
                    : 'bg-[#F4F7F5] text-slate-600'
                }`}
              >
                ≤ {m} Min.
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredActivities.map((act) => (
            <div
              key={act.id}
              className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/90 flex flex-col justify-between space-y-3 hover:border-[#74956C] transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-[#74956C]/15 text-[#4d6847] flex items-center gap-1">
                    <Car className="h-3 w-3" /> {act.drive_minutes_from_gruet} Min. ab Grüt
                  </span>
                  <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-[#5CA6CE]" /> {act.municipality}
                  </span>
                </div>

                <h3 className="font-extrabold text-sm sm:text-base text-[#1E293B]">
                  {act.title}
                </h3>

                <p className="text-xs text-slate-600 leading-relaxed">{act.description}</p>

                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#F4F7F5] text-slate-700">
                    <Baby className="h-3 w-3 text-[#74956C]" />
                    {act.age_recommendation}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#5CA6CE]/12 text-[#2d7ba4]">
                    {act.weather_suitability === 'rain'
                      ? '🌧️ Ideal bei Regen'
                      : act.weather_suitability === 'sun'
                      ? '☀️ Schönwetter'
                      : '🌤️ Jedes Wetter'}
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-2.5 border-t border-slate-100">
                <a
                  href={act.event_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#5CA6CE] hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Offizielle Webseite & Infos
                </a>

                <button
                  type="button"
                  onClick={() => handleAddActivityToCalendar(act)}
                  className="w-full py-2 px-3 rounded-xl bg-[#74956C] hover:bg-[#618059] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                >
                  <CalendarPlus className="h-3.5 w-3.5" />
                  Am {plannedDate.slice(8, 10)}.{plannedDate.slice(5, 7)}. in Kalender planen
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
