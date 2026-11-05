'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { useFamily } from '@/context/family-context';
import { VoiceInputButton } from '@/components/voice-input-button';
import { ZURICH_OBERLAND_EVENT_PORTALS } from '@/lib/seed-data';
import { LeisureActivity, LeisureCategory } from '@/types/family';

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

export default function LeisurePage() {
  const { leisureActivities, addCalendarEvent, members } = useFamily();

  const [aiQuery, setAiQuery] = useState('');
  const [weatherMode, setWeatherMode] = useState<'any' | 'sun' | 'rain'>('any');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);

  // Calendar Scheduling State
  const [plannedDate, setPlannedDate] = useState<string>(getNextSaturdayIso());
  const [startTime, setStartTime] = useState<string>('10:00');
  const [endTime, setEndTime] = useState<string>('15:00');
  const [addedBanner, setAddedBanner] = useState<string | null>(null);

  // Filter State for Curated Activities
  const [selectedCategory, setSelectedCategory] = useState<LeisureCategory | 'all'>('all');
  const [maxMinutes, setMaxMinutes] = useState<number>(30);

  const familyMemberIds = members.filter((m) => m.role !== 'kiosk').map((m) => m.id);

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
              ? 'Schlechtwetter-Ausflug mit Kleinkind im Zürcher Oberland'
              : 'Schöner Familienausflug im Zürcher Oberland (max. 30 Min. ab Grüt ZH)'),
          weatherFilter: weatherMode,
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

  const filteredActivities = leisureActivities.filter((act) => {
    if (act.drive_minutes_from_gruet > maxMinutes) return false;
    if (selectedCategory !== 'all' && act.category !== selectedCategory) return false;
    if (
      weatherMode === 'rain' &&
      act.weather_suitability !== 'rain' &&
      act.weather_suitability !== 'any'
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {addedBanner && (
        <div className="bg-[#74956C] text-white px-4 py-3 rounded-2xl shadow-sm flex items-center justify-between text-sm font-bold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>{addedBanner}</span>
          </div>
          <Link
            href="/calendar"
            className="px-3 py-1 rounded-lg bg-white text-[#74956C] text-xs font-extrabold shrink-0"
          >
            Zum Kalender →
          </Link>
        </div>
      )}

      {/* Top Box: Gemini AI Leisure Planner & Local Event URL Parser */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
        <div className="bg-gradient-to-r from-[#74956C] to-[#5CA6CE] text-white px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shadow-2xs">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold">
                Freizeitplaner Zürcher Oberland (≤ 30 Min. ab 8624 Grüt ZH)
              </h1>
              <p className="text-xs text-white/90">
                Lass dir von Gemini passende Ausflüge vorschlagen oder füge einen Link einer lokalen Eventseite ein, um ihn direkt im Familienkalender zu speichern
              </p>
            </div>
          </div>

          <Link
            href="/calendar"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold shrink-0"
          >
            <CalendarCheck2 className="h-4 w-4" />
            Familienkalender öffnen
          </Link>
        </div>

        <form onSubmit={handleAskGeminiLeisure} className="p-5 space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 flex items-center gap-2">
              <input
                type="text"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                placeholder='Wunsch oder Event-Link (z.B. "Regenprogramm mit Kleinkind", "Tiere füttern" oder Link von zuerioberland-tourismus.ch)...'
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-[#1E293B] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5CA6CE]"
              />
              <VoiceInputButton onTranscript={(t) => setAiQuery(t)} />
            </div>

            <button
              type="submit"
              disabled={isGenerating}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#5CA6CE] hover:bg-[#488eb5] text-white font-bold text-sm shadow-xs transition-all shrink-0"
            >
              <Sparkles className="h-4 w-4" />
              {isGenerating
                ? 'Gemini sucht im Zürcher Oberland...'
                : 'KI-Vorschläge & Events aufbereiten'}
            </button>
          </div>

          {/* Quick Scheduling Bar + Weather Mode */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
            <div className="md:col-span-5 bg-[#F4F7F5] p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-600">Wetter-Modus:</span>
              <div className="flex gap-1 bg-white p-1 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setWeatherMode('any')}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                    weatherMode === 'any' ? 'bg-[#74956C] text-white' : 'text-slate-600'
                  }`}
                >
                  Egal
                </button>
                <button
                  type="button"
                  onClick={() => setWeatherMode('sun')}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1 ${
                    weatherMode === 'sun' ? 'bg-amber-500 text-white' : 'text-slate-600'
                  }`}
                >
                  <Sun className="h-3.5 w-3.5" /> Sonne
                </button>
                <button
                  type="button"
                  onClick={() => setWeatherMode('rain')}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1 ${
                    weatherMode === 'rain' ? 'bg-[#5CA6CE] text-white' : 'text-slate-600'
                  }`}
                >
                  <CloudRain className="h-3.5 w-3.5" /> Regen / Indoor
                </button>
              </div>
            </div>

            <div className="md:col-span-7 bg-[#F4F7F5] p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#1E293B]">
                Ziel-Datum für 1-Klick Kalender-Eintrag:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={plannedDate}
                  onChange={(e) => setPlannedDate(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-[#1E293B]"
                />
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-[#1E293B]"
                />
                <span className="text-xs text-slate-400">bis</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-[#1E293B]"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Gemini Suggestions Output */}
        {aiSuggestions.length > 0 && (
          <div className="px-5 pb-5 space-y-3 border-t border-slate-100 pt-4 bg-[#F4F7F5]/60">
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold text-sm text-[#1E293B] flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-[#5CA6CE]" />
                Aufbereitete Gemini-Empfehlungen für euch (≤ 30 Min. ab Grüt ZH)
              </h2>
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
                  className="bg-white rounded-2xl p-4 border-2 border-[#5CA6CE]/40 shadow-xs flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#74956C]/15 text-[#4d6847] flex items-center gap-1">
                        <Car className="h-3 w-3" /> {sug.drive_minutes_from_gruet} Min. ab Grüt
                      </span>
                      <span className="text-[11px] font-bold text-slate-500">
                        {sug.municipality}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-sm text-[#1E293B]">{sug.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{sug.description}</p>

                    {sug.tip && (
                      <p className="text-[11px] bg-[#F4F7F5] p-2 rounded-lg text-slate-700 border border-slate-200/80">
                        <strong>Familien-Tipp:</strong> {sug.tip}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <a
                      href={sug.event_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#5CA6CE] hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Eventseite / Infos öffnen
                    </a>

                    <button
                      type="button"
                      onClick={() => handleAddActivityToCalendar(sug)}
                      className="w-full py-2 px-3 rounded-xl bg-[#74956C] hover:bg-[#618059] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <CalendarPlus className="h-3.5 w-3.5" />
                      Am {plannedDate.slice(8, 10)}.{plannedDate.slice(5, 7)}. in Kalender eintragen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Direct Links to Local Event Portals in Zürcher Oberland */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/90 space-y-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-[#5CA6CE]/15 text-[#2d7ba4]">
            LOKALE EVENT-KALENDER & VERANSTALTUNGSSEITEN
          </span>
          <h2 className="font-extrabold text-base text-[#1E293B] mt-1 flex items-center gap-2">
            <Globe className="h-5 w-5 text-[#5CA6CE]" />
            Aktuelle Wochenend-Events in der Region durchstöbern
          </h2>
          <p className="text-xs text-slate-600">
            Öffne ein lokales Eventportal, kopiere bei Gefallen den Link einer Veranstaltung oben in das KI-Feld – und Gemini trägt sie fixfertig in euren Kalender ein.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {ZURICH_OBERLAND_EVENT_PORTALS.map((portal) => (
            <a
              key={portal.id}
              href={portal.url}
              target="_blank"
              rel="noreferrer"
              className="group p-4 rounded-2xl bg-[#F4F7F5] hover:bg-[#5CA6CE]/10 border border-slate-200 hover:border-[#5CA6CE] transition-all flex flex-col justify-between space-y-3"
            >
              <div className="space-y-1.5">
                <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-white text-[#74956C] border border-slate-200">
                  {portal.badge}
                </span>
                <h3 className="font-extrabold text-sm text-[#1E293B] group-hover:text-[#2d7ba4] flex items-start justify-between gap-1">
                  <span>{portal.title}</span>
                  <ExternalLink className="h-4 w-4 shrink-0 text-[#5CA6CE]" />
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">{portal.description}</p>
              </div>
              <span className="text-[11px] font-bold text-[#5CA6CE] group-hover:underline">
                {portal.region} →
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* Section 3: Curated Family Destinations within 30 Minutes from 8624 Grüt (ZH) */}
      <div className="space-y-4">
        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200/90 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {(Object.keys(CATEGORY_LABELS) as (LeisureCategory | 'all')[]).map((catKey) => (
              <button
                key={catKey}
                type="button"
                onClick={() => setSelectedCategory(catKey)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  selectedCategory === catKey
                    ? 'bg-[#74956C] text-white shadow-2xs'
                    : 'bg-[#F4F7F5] text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                {CATEGORY_LABELS[catKey]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <Car className="h-3.5 w-3.5 text-[#74956C]" />
              Max. Fahrzeit ab Grüt:
            </span>
            {[10, 20, 30].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => setMaxMinutes(mins)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                  maxMinutes === mins
                    ? 'bg-[#5CA6CE] text-white'
                    : 'bg-[#F4F7F5] text-slate-600'
                }`}
              >
                ≤ {mins} Min.
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredActivities.map((act: LeisureActivity) => (
            <div
              key={act.id}
              className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/90 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-[#74956C]/15 text-[#4d6847] flex items-center gap-1">
                    <Car className="h-3.5 w-3.5" />
                    {act.drive_minutes_from_gruet} Min. ab Grüt ZH
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      act.weather_suitability === 'rain'
                        ? 'bg-[#5CA6CE]/15 text-[#2d7ba4]'
                        : act.weather_suitability === 'sun'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {act.weather_suitability === 'rain'
                      ? '🌧️ Ideal bei Regen'
                      : act.weather_suitability === 'sun'
                      ? '☀️ Schönwetter'
                      : '🌤️ Jedes Wetter'}
                  </span>
                </div>

                <div>
                  <h3 className="font-extrabold text-base text-[#1E293B]">{act.title}</h3>
                  <p className="text-xs font-bold text-[#5CA6CE] flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {act.municipality}
                  </p>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{act.description}</p>

                <div className="p-2.5 rounded-xl bg-[#F4F7F5] border border-slate-200/80 space-y-1 text-[11px]">
                  <p className="font-bold text-[#1E293B] flex items-center gap-1">
                    <Baby className="h-3.5 w-3.5 text-[#74956C]" />
                    {act.age_recommendation}
                  </p>
                  {act.tip && <p className="text-slate-600">💡 {act.tip}</p>}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-2">
                <a
                  href={act.event_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5CA6CE] hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Webseite & aktuelle Events öffnen
                </a>

                <button
                  type="button"
                  onClick={() => handleAddActivityToCalendar(act)}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#74956C] hover:bg-[#618059] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                >
                  <CalendarPlus className="h-4 w-4" />
                  Am {plannedDate.slice(8, 10)}.{plannedDate.slice(5, 7)}. ({startTime}–{endTime}) in Kalender eintragen
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

