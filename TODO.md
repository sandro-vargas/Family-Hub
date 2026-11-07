# 📋 Familien-App — ToDo & Roadmap

Dieses Dokument führt geplante und offene Arbeitsschritte auf, die zu einem späteren Zeitpunkt umgesetzt werden.

---

## ⏳ Phase 2: Google Kalender 2-Wege Synchronisation (Service Account)

Die API-Routen und Logik für die bidirektionale Synchronisation (`src/app/api/calendar/google-sync/route.ts`) sind vorbereitet. Die Verknüpfung mit Google Cloud wird in Schritt 2 finalisiert.

### Offene Aufgaben:
- [ ] **Google Cloud Console Projekt** erstellen oder bestehendes nutzen.
- [ ] **Google Calendar API** im Projekt aktivieren.
- [ ] **Service Account** anlegen und Schlüssel (`JSON`) herunterladen.
- [ ] Den Google Kalender der Familie für die Service-Account-Mailadresse freigeben (Berechtigung: *Termine ändern*).
- [ ] Folgende Umgebungsvariablen in Vercel / `.env.local` hinterlegen:
  - `GOOGLE_CALENDAR_ID`: Kalender-ID (z. B. `primary` oder `xxx@group.calendar.google.com`)
  - `GOOGLE_SERVICE_ACCOUNT_EMAIL`: E-Mail des Service Accounts (z. B. `family-sync@project-id.iam.gserviceaccount.com`)
  - `GOOGLE_PRIVATE_KEY`: Privater Schlüssel des Service Accounts (aus der JSON-Datei)
- [ ] 2-Wege-Sync im Produktivbetrieb testen (Termin in Google Kalender erstellen → Erscheint in Familien-App; Termin in Familien-App erstellen → Erscheint im Google Kalender).

---

## ✅ Phase 3: Eigene Login-Seite & Familien-Authentifizierung (Abgeschlossen)
- [x] Vercel Authentication durch eigene In-App-Lösung ersetzt
- [x] Eigene Login-Seite (`/login`) im passenden Android-Look mit taktilem Ziffernblock & Profilauswahl
- [x] Next.js Middleware (`src/middleware.ts`) leitet unbefugte Besucher sofort auf `/login` um
- [x] Familien-PIN / Passcode Schutz (`FAMILY_PASSCODE`, Standard: `8624`)
- [x] 1-Jahres Session-Cookie („Angemeldet bleiben“ für Handys & Wand-iPad)
- [x] Manueller Sperren-Button in der Top-Bar integriert

---

## ✅ Bereits abgeschlossen (Phase 1)
- [x] Android Home Screen Redesign (Widgets, App Grid, Floating Dock)
- [x] Monatskalenderansicht (Mo–So Matrix mit Tages-Inspektor)
- [x] Mahlzeitenplaner mit Portionen-Stepper & 7-Tage-Abdeckungsübersicht
- [x] Freizeitplaner für Zürcher Oberland mit Gemini 3.8 Flash KI
- [x] ToDo-Tool mit Kita/Haushalt/Familie Kategorien & Kalender-Fälligkeiten
- [x] Familienmitglieder aktualisiert: Jenni, Sandro, Chiara (Tochter Chiara von ToDos ausgeschlossen)
- [x] Modul "Bedarf" (ehemals Galaxus)
- [x] Vorbereitung für Vercel-Deployment & Supabase-Schema

