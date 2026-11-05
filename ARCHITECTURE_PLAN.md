# Family Hub – Architektur-, Design- & Weiterentwicklungs-Dokumentation

Diese Datei dokumentiert den aktuellen Stand von **Family Hub**, damit das Projekt jederzeit auf einem anderen PC (über MEGA-Sync oder Git) nahtlos in **Google Antigravity** weiterbearbeitet werden kann.

---

## 1. Schnellstart auf einem neuen PC

Da der Projektordner in **MEGA** (`Familien Applikation`) liegt, werden alle Quellcode-Dateien, Datenbank-Migrationen und Antigravity-Skills automatisch synchronisiert.

Wenn du an einem anderen PC arbeitest, führe im Projektverzeichnis einfach folgende Befehle aus:

```bash
# 1. Abhängigkeiten prüfen / installieren (falls node_modules auf dem neuen PC abweicht)
npm install

# 2. Entwicklungsserver starten
npm run dev
```

Danach ist die App sofort unter **http://localhost:3000** erreichbar.

---

## 2. Design-System & Farbkonzept

- **Applikationsname:** `Family Hub`
- **Standort (Wetter, Lokalisierung & Freizeitplaner):** `8624 Grüt (ZH)` (`de-CH`)
- **Primärfarbe (Salbeigrün):** `#74956C` (Navigation, Primär-Buttons, erledigte/abgehakte Elemente)
- **Zweitfarbe / Akzent (Himmel-/Ozeanblau):** `#5CA6CE` (KI-Assistent, Wetter, Thermomix-Badges, Links, aktiver iPad-Modus)
- **iPad-Modus (`isKioskMode`):**
  - Der grosse **Header mit Datum, Uhrzeit und Live-Wetter (8624 Grüt ZH)** auf der Startseite (`/`) wird **nur** eingeblendet, wenn oben rechts in der Kopfleiste der Button **„iPad Modus“** aktiviert ist.

---

## 3. Projektstruktur & Neue Module

```text
Familien Applikation/
├── supabase/
│   ├── migrations/
│   │   └── 0001_initial_schema.sql         # PostgreSQL-Schema + RLS (inkl. ToDos & Kalender-Verknüpfung)
│   └── seed.sql
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── ai/leisure/route.ts         # Gemini KI-Freizeitplaner Zürcher Oberland (<= 30 Min. ab Grüt ZH)
│   │   │   ├── ai/recipe/route.ts          # Gemini Rezept- & Zutaten-KI (inkl. Thermomix)
│   │   │   ├── calendar/google-sync/route.ts # Bidirektionaler 2-Wege Google Kalender Sync (API v3)
│   │   │   ├── metadata/galaxus/route.ts   # Galaxus OpenGraph & JSON-LD Produkt-Parser
│   │   │   └── weather/route.ts            # Open-Meteo Wetter-API für 8624 Grüt (ZH)
│   │   ├── calendar/page.tsx               # Familienkalender (inkl. Kategorien Essen, ToDo, Ausflug & Google Sync)
│   │   ├── leisure/page.tsx                # Freizeitplaner Zürcher Oberland & lokale Eventportale
│   │   ├── meals/page.tsx                  # Wochenplan, Portionengrösse, 7-Tage-Abdeckungsübersicht & Thermomix
│   │   ├── needs/page.tsx                  # Haushaltsbedarf & Galaxus-Liste
│   │   ├── settings/page.tsx               # Profilfarben, Standard-Portionen, Google Kalender Sync & Push-Setup
│   │   ├── share-target/page.tsx           # Android Web Share Target Empfänger
│   │   ├── shopping/page.tsx               # Einkaufsliste (Migros/Coop Sortierung & Smart-Merge)
│   │   ├── todos/page.tsx                  # Familien-ToDo-Tool (Kita, Haushalt, Familie + eigene, Offen für alle & Deadlines)
│   │   ├── layout.tsx                      # Root Layout (de-CH)
│   │   ├── manifest.ts                     # PWA Manifest inkl. share_target
│   │   └── page.tsx                        # Startseite / Übersicht (+ iPad-Header)
│   ├── components/
│   │   ├── app-shell.tsx                   # Navigation, 1-Tap Profil-Umschalter & iPad-Modus
│   │   ├── creator-badge.tsx               # Farbiges Kürzel ("Erstellt von SA / FR / TO")
│   │   └── voice-input-button.tsx          # Mikrofon-Spracheingabe (Web Speech API de-CH)
│   ├── context/
│   │   └── family-context.tsx              # Zentraler State + Auto-Sync (Essen & ToDo-Deadlines -> Kalender)
│   ├── lib/
│   │   ├── supabase/                       # @supabase/ssr Client & Server Setup
│   │   └── seed-data.ts                    # Startdaten (inkl. Zürcher Oberland Ausflugsziele & ToDo-Kategorien)
│   └── types/
│       └── family.ts                       # TypeScript Interfaces
└── .env.example                            # Vorlage für .env.local (Supabase, Gemini & Google Calendar Sync)
```

---

## 4. Umgebungsvariablen (`.env.local`)

Für den Live-Betrieb mit **Supabase**, **Google Gemini API** und **2-Wege Google Kalender Sync** kopiere `.env.example` nach `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://dein-projekt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=dein-supabase-anon-key
GEMINI_API_KEY=dein-google-ai-studio-key

GOOGLE_CALENDAR_ID=deine-kalender-id@group.calendar.google.com
GOOGLE_SERVICE_ACCOUNT_EMAIL=dein-service-account@projekt.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```
