# Family Hub (8624 Grüt ZH)

Gemeinsame Familien-Applikation (PWA) für Termine, Essensplanung (inkl. **Google Gemini KI** & **Thermomix/Cookidoo**), smarte Einkaufsliste (Migros/Coop) und Haushaltsbedarf (Galaxus Web Share Target).

## Farbkonzept & Design
- **Hauptfarbe (Salbeigrün):** `#74956C`
- **Zweitfarbe (Himmel-/Ozeanblau):** `#5CA6CE`
- **iPad-Modus:** Oben rechts über den Schalter **„iPad Modus“** aktivierbar (blendet auf der Übersicht den grossen Header mit Datum, Uhrzeit und dem Wetter für 8624 Grüt ZH ein).

## Weiterarbeiten auf einem anderen PC

1. Stelle sicher, dass **Node.js (v20+)** installiert ist.
2. Öffne diesen Ordner (`Familien Applikation`) in **Google Antigravity**.
3. Führe im Terminal aus:
   ```bash
   npm install
   npm run dev
   ```
4. Öffne [http://localhost:3000](http://localhost:3000).

Alle Details zur Architektur, zum Datenbank-Schema (`supabase/migrations/0001_initial_schema.sql`) und zu den Antigravity-Skills (`.agent/skills/family-app-architecture/SKILL.md`) findest du in [ARCHITECTURE_PLAN.md](./ARCHITECTURE_PLAN.md).
