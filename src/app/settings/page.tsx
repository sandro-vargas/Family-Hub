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
} from 'lucide-react';
import { useFamily } from '@/context/family-context';

export default function SettingsPage() {
  const {
    household,
    members,
    updateMemberColor,
    updateDefaultPortions,
    isLiveSupabase,
  } = useFamily();

  const [pushStatus, setPushStatus] = useState<string | null>(null);

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

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="bg-white px-4 py-2.5 rounded-2xl shadow-xs border border-slate-200/90 flex items-center justify-between gap-2">
        <h1 className="text-base sm:text-lg font-extrabold text-[#1E293B] flex items-center gap-2">
          <Settings className="h-5 w-5 text-[#5CA6CE]" />
          Einstellungen & Profile
        </h1>
        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#74956C]/15 text-[#74956C]">
          Setup
        </span>
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
