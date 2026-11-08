# 📋 Familien-App — ToDo & Roadmap (nach Reitern strukturiert)

Dieses Dokument bündelt alle offenen Aufgaben, Dein dediziertes Feedback pro Reiter sowie die übergreifenden Themen.

---

## 🌐 Übergreifende Themen & Layout

### Offene Aufgaben:
- [ ] **Kompaktere Seiten-Header:** Die Boxen mit den Überschriften auf den jeweiligen Reitern nehmen aktuell zu viel vertikalen Platz weg → deutlich kompakter und platzsparender gestalten.
- [ ] **Mobil-Ansicht & Responsiveness (Dedizierter Test folgt):**
  - [ ] Ausführlicher Praxistest auf Smartphones (Pixel / iPhone) und iPad im Alltag.
  - [ ] Spezifische Layout- und Bedienungs-Feedbacks aus dem Mobil-Test hier ergänzen und umsetzen.

### Bereits abgeschlossen:
- [x] Android-inspiriertes Grunddesign mit Floating Dock Navigation.
- [x] Eigene Familien-Login-Seite (`/login`) mit SHA-256 Session-Token, IP-Brute-Force-Sperre und 1-Jahres-Cookie („Angemeldet bleiben“).
- [x] Echtzeit-Synchronisation über mehrere Geräte via Supabase Realtime (WebSockets) & Vercel Deployment.
- [x] Familienprofile angepasst auf **Sandro** (`SA`), **Jenni** (`JE`) und **Chiara** (`CH`).

---

## 🏠 Reiter: Home (`/`)

### Offene Aufgaben:
- [ ] **Essensplan-Widget entfernen:** Die Essensplan-Box auf dem Home Screen komplett herausnehmen.
- [ ] **Wochenübersicht mit Kalender-Sync & Personenfilter:**
  - Synchronisation zum Kalender sicherstellen.
  - Darstellung auf dem Home Screen als **Wochenübersicht**.
  - Filter nach betroffenen Personen ermöglichen (**Wichtig:** **Chiara** immer mit anzeigen!).
- [ ] **Icon-/Widget-Übersicht unten entfernen:** Das grosse App-Icon-Grid im unteren Bereich des Home Screens entfernen (Navigation erfolgt über das Dock).
- [ ] **Schnell-Eingabe entfernen:** Die Einkaufs-Schnelleingabe-Leiste ganz unten auf dem Home Screen entfernen.

### Bereits abgeschlossen:
- [x] Live-Wetter-Integration für **8624 Grüt (ZH)** (Open-Meteo API).

---

## 🛒 Reiter: Einkauf (`/shopping`)

### Offene Aufgaben:
- [ ] **Einträge editierbar machen:** Bestehende Artikel auf der Einkaufsliste müssen nachträglich bearbeitbar sein (z. B. Menge/Einheit/Bezeichnung ändern: statt `500 g Rüebli` doch nur `200 g Rüebli`).
- [ ] **Automatische Kategorie-Zuweisung:** Bei neuen Eingaben soll die passende Supermarkt-Kategorie (Früchte & Gemüse, Milchprodukte, Backwaren etc.) automatisch erkannt und gesetzt werden (im Zweifel automatisch `"Sonstiges"` auswählen).

### Bereits abgeschlossen:
- [x] Smart-Merge identischer Zutaten & Migros/Coop-Kategorien-Reihenfolge.

---

## 🍽️ Reiter: Essensplanung (`/meals`)

### Offene Aufgaben:
- [ ] **Essenswunschliste ganz nach oben:** Die Wunschliste auf der Seite ganz nach oben setzen.
- [ ] **Automatische Bereinigung der Wunschliste:** Wenn ein Gericht von der Essenswunschliste eingeplant wurde, soll es automatisch aus der Wunschliste entfernt werden.
- [ ] **KI-Assistent — Pop-up & Zutaten-Speicherung:**
  - Wenn ein neues Rezept mit dem KI-Assistenten eingeplant wird, wird das Pop-up aktuell vom Menü/Dock verdeckt → grafisch und im Layout (Z-Index /Abstand) sauber anpassen.
  - Zutaten, die nicht zuhause sind und angeklickt werden, landen direkt auf der Einkaufsliste.
  - Änderungen müssen dauerhaft in der **Rezept- & Zutaten-Übersicht** gespeichert werden.
- [ ] **KI-Assistent — Aufwärm-Box entfernen:** Die Box/Option *„+ Morgen Mittag aufwärmen“* im KI-Assistenten entfernen.
- [ ] **Gespeicherte Rezepte (Einklappen, Kategorien & Filter):**
  - Bereich „Gespeicherte Rezepte“ soll alle bereits eingeplanten Rezepte beinhalten.
  - Standardmässig **eingeklappt** darstellen.
  - Kategorisieren nach **Ernährungsart** (`Fleisch`, `Vegi`) und **Dauer** (Zubereitungszeit).
  - Kategorien **filterbar** machen.
- [ ] **Essensabdeckung (28-Mahlzeiten-Logik & Kalender-Prüfung):**
  - Vereinfachte Gesamtübersicht über abgedeckte Mahlzeiten (unabhängig ob Mittag oder Abend): **7 Tage × 2 Mahlzeiten × 2 Personen = 28 Mahlzeiten**.
  - **Kalender-Abgleich:** Automatisch im Kalender prüfen, ob jemand bereits einen Abendplan/Termin hat – falls ja, muss entsprechend z. B. eine Portion weniger eingeplant werden.
- [ ] **Essensplanung editierbar & verschiebbar:** Geplante Gerichte im Wochenplan nachträglich editieren und auf andere Tage verschieben können.

### Bereits abgeschlossen:
- [x] Portionen-Stepper (`- / +`) & automatische Kalendersynchronisation (Kategorie `Essen`).

---

## 📅 Reiter: Kalender (`/calendar`)

### Offene Aufgaben (Funktion & Darstellung):
- [ ] **Intelligente Uhrzeit-Logik:**
  - Wenn die Startzeit (**„von“**) angepasst wird, soll die Endzeit (**„bis“**) standardmässig automatisch auf **1 Stunde später** mitgezogen werden.
  - Uhrzeit-Auswahl auf **15-Minuten-Schritte** (`00`, `15`, `30`, `45`) begrenzen.
- [ ] **Keine manuellen Kategorien:** Kategorien, die automatisch aus anderen Reitern entstehen (`Essen`, `ToDo`, `Ausflüge`), dürfen beim manuellen Erstellen eines Termins nicht auswählbar sein. Grundsätzlich gibt es beim manuellen Anlegen keine zusätzlichen Kategorien.
- [ ] **Neues Farbkonzept im Kalender:**
  - Dedizierte Farben für die automatisch generierten Kalendereinträge (`Essen`, `ToDo`, `Ausflüge`).
  - Für reguläre Termine jeweils die definierte Farbe der betroffenen Person verwenden (`Sandro`, `Jenni`, `Chiara`).
  - Sobald **mehr als 1 Person** betroffen ist, **Grau** verwenden.
- [ ] **Chiara immer sichtbar:** Termine von **Chiara** sollen im Kalender immer angezeigt werden (auch wenn auf Sandro oder Jenni gefiltert wird).
- [ ] **Toggle für automatische Einträge:** Automatisch generierte Einträge (`Essen`, `ToDo`) per Schalter ein- und ausblendbar machen (**Standard/Default: ausgeblendet**).

### Offene Aufgaben (Google Kalender 2-Wege-Sync — Infrastruktur):
- [ ] **Google Cloud Console Projekt** erstellen und **Google Calendar API** aktivieren.
- [ ] **Service Account** anlegen, JSON-Schlüssel herunterladen und bestehenden Familienkalender für die Service-Account-E-Mail freigeben (*Termine ändern*).
- [ ] Umgebungsvariablen in Vercel hinterlegen (`GOOGLE_CALENDAR_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`) und 2-Wege-Sync im Live-Betrieb testen.

### Bereits abgeschlossen:
- [x] Interaktive Monatskalenderansicht (`Mo–So` Matrix) mit Tages-Inspektor.
- [x] API-Route (`src/app/api/calendar/google-sync/route.ts`) für 2-Wege-Synchronisation vorbereitet.

---

## ✅ Reiter: ToDos (`/todos`)

### Offene Aufgaben:
- [ ] **ToDos editierbar machen:** Bestehende Aufgaben nachträglich bearbeiten können (**Titel, Zuständigkeit, Priorität, Deadline, Notiz**).
- [ ] **Sortierung nach Priorität & Deadline:** Die ToDo-Übersicht auch nach **Priorität** und **Deadline** sortierbar machen.

### Bereits abgeschlossen:
- [x] Kategorien (`Kita`, `Haushalt`, `Familie` + eigene Kategorien).
- [x] Automatische Synchronisation von ToDo-Deadlines in den Kalender.
- [x] Tochter **Chiara** von ToDo-Zuweisungen ausgeschlossen (nur Sandro, Jenni oder „Offen für alle“).

---

## 🧭 Reiter: Freizeit (`/leisure`)

### Offene Aufgaben:
- [ ] **Event-Crawling mit Direktlinks:** Nicht nur statisch auf die Eventkalender-Portale verlinken, sondern konkrete **gecrawlte Ereignisse/Veranstaltungen direkt auflisten** – inklusive direkter Verlinkung auf die Fundstellen-URL des jeweiligen Events.
- [ ] **Wetter- & Saison-Anpassung:** Vorschläge dynamisch an die **aktuellen Witterungen innerhalb der Woche** (Wochen-Wetterbericht) sowie die **aktuelle Saison/Jahreszeit** anpassen.

### Bereits abgeschlossen:
- [x] Kuratierte Ausflugsziele im Zürcher Oberland (≤ 30 Min. ab 8624 Grüt ZH) & 1-Klick Kalender-Eintrag.

---

## 📦 Reiter: Bedarf (`/needs`)

### Offene Aufgaben:
- [ ] **Listenansicht nach Priorität:** Darstellung als übersichtliche Listenansicht, standardmässig **absteigend nach Priorität** (`Hoch` → `Normal` → `Niedrig`) sortiert.
- [ ] **Einträge editierbar machen:** Bestehende Bedarfs-Einträge nachträglich bearbeiten können (**Titel, Notiz, Priorität**).

### Bereits abgeschlossen:
- [x] Modul von „Galaxus“ in „Bedarf“ umbenannt & Basis-Listenfunktion eingerichtet.
