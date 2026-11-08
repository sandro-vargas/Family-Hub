'use client';

import React, { useState } from 'react';
import {
  Settings,
  BellRing,
  Database,
  Users,
  CheckCircle2,
  Smartphone,
  Tablet,
  CalendarSync,
  RefreshCw,
} from 'lucide-react';
import { useFamily } from '@/context/family-context';

export default function SettingsPage() {
  const {
    household,
    members,
    updateMemberColor,
    updateDefaultPortions,
    isLiveSupabase,
    googleSyncConfig,
    updateGoogleSyncConfig,
    syncWithGoogleCalendar,
    isSyncingGoogle,
  } = useFamily();

  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const [syncResultMessage, setSyncResultMessage] = useState<string | null>(null);

  const handleEnableWebPush = async () => {
    if (!('Notification' in window)) {
      setPushStatus('Dieser Browser unterstützt keine Web-Push-Benachrichtigungen.');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setPushStatus(
        'Push-Benachrichtigungen für dieses Gerät erfolgreich aktiviert! Du erhältst eine Nachricht, sobald jemand Artikel auf die Einkaufsliste setzt.'
      );
    } else {
      setPushStatus('Benachrichtigungs-Berechtigung wurde abgelehnt.');
    }
  };

  const handleTestGoogleSync = async () => {
    const res = await syncWithGoogleCalendar();
    setSyncResultMessage(res.message);
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="bg-white px-4 py-2.5 rounded-2xl shadow-xs border border-slate-200/90 flex items-center justify-between gap-2">
        <h1 className="text-base sm:text-lg font-extrabold text-[#1E293B] flex items-center gap-2">
          <Settings className="h-5 w-5 text-[#5CA6CE]" />
          Einstellungen, Profile & Google Kalender Sync
        </h1>
        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#74956C]/15 text-[#74956C]">
          Setup
        </span>
      </div>

      {/* Bidirectional Google Calendar Synchronization */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/90 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-bold text-base text-[#1E293B] flex items-center gap-2">
              <CalendarSync className="h-5 w-5 text-[#5CA6CE]" />
              Bestehenden Google Kalender verknüpfen (2-Wege-Synchronisation)
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Synchronisiert Termine in beide Richtungen zwischen eurem bestehenden Google-Familienkalender und dem Family Hub (inkl. Essensplan, ToDo-Deadlines und Ausflügen).
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[#74956C]/15 text-[#4d6847] shrink-0">
            Bidirektional aktiv
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">
              Bestehende Google Kalender-ID
            </label>
            <input
              type="text"
              value={googleSyncConfig.calendar_id}
              onChange={(e) => updateGoogleSyncConfig({ calendar_id: e.target.value })}
              placeholder="z.B. primary oder xxx@group.calendar.google.com"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-[#1E293B]"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Zu finden in den Google Kalender Einstellungen unter „Kalender integrieren → Kalender-ID“.
            </span>
          </div>

          <div className="space-y-2">
            <label className="flex items-center justify-between p-3 rounded-xl bg-[#F4F7F5] border border-slate-200 cursor-pointer">
              <div>
                <span className="text-xs font-bold text-[#1E293B] block">
                  🍽️ Essensplan („Essen“) mit Google synchronisieren
                </span>
                <span className="text-[11px] text-slate-500">
                  Überträgt Abendessen & Aufwärm-Mittagessen inkl. Portionen
                </span>
              </div>
              <input
                type="checkbox"
                checked={googleSyncConfig.sync_meals}
                onChange={(e) => updateGoogleSyncConfig({ sync_meals: e.target.checked })}
                className="h-4 w-4 accent-[#74956C]"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-[#F4F7F5] border border-slate-200 cursor-pointer">
              <div>
                <span className="text-xs font-bold text-[#1E293B] block">
                  📌 ToDo-Deadlines mit Google synchronisieren
                </span>
                <span className="text-[11px] text-slate-500">
                  Überträgt alle fälligen Familien-ToDos als Ganztages-Einträge
                </span>
              </div>
              <input
                type="checkbox"
                checked={googleSyncConfig.sync_todos}
                onChange={(e) => updateGoogleSyncConfig({ sync_todos: e.target.checked })}
                className="h-4 w-4 accent-[#74956C]"
              />
            </label>
          </div>
        </div>

        {/* Step-by-Step Guide for Connecting Existing Google Calendar */}
        <div className="p-4 rounded-xl bg-[#F4F7F5] border border-slate-200 space-y-2 text-xs text-slate-700">
          <p className="font-extrabold text-[#1E293B]">
            So verbindet ihr euren bestehenden Google Kalender dauerhaft (ideal auch für das iPad):
          </p>
          <ol className="list-decimal list-inside space-y-1 text-slate-600">
            <li>
              In der Google Cloud Console die <strong>Google Calendar API</strong> aktivieren und einen kostenlosen <strong>Service Account</strong> (oder OAuth2 Refresh-Token) erstellen.
            </li>
            <li>
              In eurem bestehenden Google Kalender unter <em>„Für bestimmte Personen freigeben“</em> die Service-Account-E-Mail eintragen und die Berechtigung <strong>„Änderungen an Terminen vornehmen“</strong> wählen.
            </li>
            <li>
              <code>GOOGLE_CALENDAR_ID</code>, <code>GOOGLE_SERVICE_ACCOUNT_EMAIL</code> und <code>GOOGLE_PRIVATE_KEY</code> in <code>.env.local</code> eintragen – danach laufen Push (App ➔ Google) und Pull (Google ➔ App) vollautomatisch.
            </li>
          </ol>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleTestGoogleSync}
            disabled={isSyncingGoogle}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#74956C] hover:bg-[#618059] text-white font-bold text-xs shadow-xs"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncingGoogle ? 'animate-spin' : ''}`} />
            {isSyncingGoogle
              ? 'Synchronisiere...'
              : 'Jetzt 2-Wege-Synchronisation ausführen'}
          </button>

          {googleSyncConfig.last_synced_at && (
            <span className="text-xs text-slate-500">
              Letzter Abgleich:{' '}
              {new Intl.DateTimeFormat('de-CH', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              }).format(new Date(googleSyncConfig.last_synced_at))}
            </span>
          )}
        </div>

        {syncResultMessage && (
          <p className="text-xs font-semibold text-[#74956C] flex items-center gap-1.5 bg-[#74956C]/10 p-3 rounded-xl">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{syncResultMessage}</span>
          </p>
        )}
      </div>

      {/* Profiles & Colors */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/90 space-y-4">
        <h2 className="font-bold text-base text-[#1E293B] flex items-center gap-2">
          <Users className="h-5 w-5 text-[#74956C]" />
          Familienmitglieder & Ersteller-Farben
        </h2>
        <p className="text-xs text-slate-600">
          Jeder Eintrag (Termin, Essen, ToDo, Einkaufsliste, Galaxus) trägt das Farbkürzel der Person, die ihn erstellt hat. Auf dem iPad im Wohnzimmer kann oben rechts per 1-Tap umgeschaltet werden.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {members.map((member) => (
            <div
              key={member.id}
              className="p-4 rounded-xl bg-[#F4F7F5] border border-slate-200 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span
                  className="h-9 w-9 rounded-full flex items-center justify-center font-bold text-white text-xs shadow-2xs"
                  style={{ backgroundColor: member.color_hex }}
                >
                  {member.short_code}
                </span>
                <div>
                  <p className="font-bold text-sm text-[#1E293B]">{member.display_name}</p>
                  <p className="text-[11px] text-slate-500 uppercase">{member.role}</p>
                </div>
              </div>

              <input
                type="color"
                value={member.color_hex}
                onChange={(e) => updateMemberColor(member.id, e.target.value)}
                className="h-8 w-10 rounded cursor-pointer border border-slate-300"
                title="Farbe ändern"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Default Portions */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/90 space-y-3">
        <h2 className="font-bold text-base text-[#1E293B]">
          Standard-Portionengrösse für die KI-Essensplanung
        </h2>
        <p className="text-xs text-slate-600">
          Standardmässig auf 4–5 Portionen eingestellt, damit das Abendessen am nächsten Tag als Mittagessen aufgewärmt werden kann.
        </p>
        <div className="flex flex-wrap gap-2">
          {[2, 3, 4, 5, 6].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => updateDefaultPortions(p)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                household.default_portions === p
                  ? 'bg-[#74956C] text-white'
                  : 'bg-[#F4F7F5] text-slate-700 border border-slate-200'
              }`}
            >
              {p} Portionen
            </button>
          ))}
        </div>
      </div>

      {/* Web Push & PWA Installation Info */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/90 space-y-4">
        <h2 className="font-bold text-base text-[#1E293B] flex items-center gap-2">
          <BellRing className="h-5 w-5 text-[#5CA6CE]" />
          Push-Benachrichtigungen & Homebildschirm-Installation (PWA)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
          <div className="p-4 rounded-xl bg-[#F4F7F5] border border-slate-200 space-y-1.5">
            <div className="font-bold text-[#1E293B] flex items-center gap-1.5">
              <Smartphone className="h-4 w-4 text-[#74956C]" />
              Google Pixel (Android)
            </div>
            <p>
              In Chrome oben rechts auf das Menü → <strong>„App installieren“</strong> tippen. Danach erscheint <em>Family Hub</em> direkt im Android-„Teilen“-Menü der Galaxus-App!
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#F4F7F5] border border-slate-200 space-y-1.5">
            <div className="font-bold text-[#1E293B] flex items-center gap-1.5">
              <Tablet className="h-4 w-4 text-[#5CA6CE]" />
              iPad im Wohnbereich (iPadOS)
            </div>
            <p>
              In Safari auf den <strong>Teilen-Button → „Zum Home-Bildschirm“</strong> tippen. Oben rechts auf <strong>„iPad Modus“</strong> tippen, um den grossen Datum-/Uhrzeit-/Wetter-Banner einzublenden.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleEnableWebPush}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#5CA6CE] hover:bg-[#488eb5] text-white font-bold text-xs shadow-xs"
        >
          <BellRing className="h-4 w-4" />
          Push-Benachrichtigungen auf diesem Gerät aktivieren
        </button>

        {pushStatus && (
          <p className="text-xs font-semibold text-[#74956C] flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            {pushStatus}
          </p>
        )}
      </div>

      {/* Supabase & Gemini Connection Status */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/90 space-y-2">
        <h2 className="font-bold text-base text-[#1E293B] flex items-center gap-2">
          <Database className="h-5 w-5 text-[#5CA6CE]" />
          Backend-Status (Supabase & Google Gemini API)
        </h2>
        <p className="text-xs text-slate-600">
          Modus:{' '}
          <strong className="text-[#74956C]">
            {isLiveSupabase
              ? 'Verbunden mit Live Supabase PostgreSQL'
              : 'Lokaler Persistenz-Modus aktiv (bereit für .env.local Schlüssel)'}
          </strong>
        </p>
        <p className="text-xs text-slate-500">
          Das vollständige SQL-Schema inkl. Row Level Security liegt unter{' '}
          <code>supabase/migrations/0001_initial_schema.sql</code>.
        </p>
      </div>
    </div>
  );
}
