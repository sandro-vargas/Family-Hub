# 📋 Familien-App — ToDo & Roadmap (nach Reitern strukturiert)

Dieses Dokument bündelt alle offenen Aufgaben, Dein dediziertes Feedback pro Reiter sowie die übergreifenden Themen.

---

## 🌐 Übergreifende Themen & Layout

### Offene Aufgaben:
- [ ] **Mobil-Ansicht & Responsiveness (Dedizierter Test folgt):**
  - [ ] Ausführlicher Praxistest auf Smartphones (Pixel / iPhone) und iPad im Alltag.
  - [ ] Spezifische Layout- und Bedienungs-Feedbacks aus dem Mobil-Test hier ergänzen und umsetzen.

### Bereits abgeschlossen:
- [x] **Kompaktere Seiten-Header:** Die Boxen mit den Überschriften auf allen Reitern deutlich kompakter und platzsparender gestaltet.
- [x] Android-inspiriertes Grunddesign mit Floating Dock Navigation.
- [x] Eigene Familien-Login-Seite (`/login`) mit SHA-256 Session-Token, IP-Brute-Force-Sperre und 1-Jahres-Cookie („Angemeldet bleiben“).
- [x] Echtzeit-Synchronisation über mehrere Geräte via Supabase Realtime (WebSockets) & Vercel Deployment.
- [x] Familienprofile angepasst auf **Sandro** (`SA`), **Jenni** (`JE`) und **Chiara** (`CH`).

---

## 🏠 Reiter: Home (`/`)

### Bereits abgeschlossen:
- [x] **Essensplan-Widget entfernen:** Die Essensplan-Box auf dem Home Screen komplett herausgenommen.
- [x] **Wochenübersicht mit Kalender-Sync & Personenfilter:**
  - Synchronisation zum Kalender sichergestellt.
  - Darstellung auf dem Home Screen als **7-Tage-Wochenübersicht**.
  - Filter nach betroffenen Personen (**Wichtig:** **Chiara** wird immer mit angezeigt!).
- [x] **Icon-/Widget-Übersicht unten entfernen:** Das grosse App-Icon-Grid im unteren Bereich des Home Screens entfernt.
- [x] **Schnell-Eingabe entfernen:** Die Einkaufs-Schnelleingabe-Leiste ganz unten auf dem Home Screen entfernt.
- [x] Live-Wetter-Integration für **8624 Grüt (ZH)** (Open-Meteo API).

---

## 🛒 Reiter: Einkauf (`/shopping`)

### Bereits abgeschlossen:
- [x] **Einträge editierbar machen:** Bestehende Artikel auf der Einkaufsliste nachträglich bearbeitbar gemacht (Menge, Einheit, Bezeichnung, Kategorie – z. B. `500 g Rüebli` → `200 g Rüebli`).
- [x] **Automatische Kategorie-Zuweisung:** Bei neuen Eingaben wird die passende Supermarkt-Kategorie automatisch erkannt und gesetzt (im Zweifel automatisch `"Sonstiges"`).
- [x] Smart-Merge identischer Zutaten & Migros/Coop-Kategorien-Reihenfolge.

---

## 🍽️ Reiter: Essensplanung (`/meals`)

### Bereits abgeschlossen:
- [x] **Essenswunschliste ganz nach oben:** Die Wunschliste auf der Seite ganz nach oben gesetzt.
- [x] **Automatische Bereinigung der Wunschliste:** Wenn ein Gericht von der Essenswunschliste eingeplant wird, wird es automatisch aus der Wunschliste entfernt.
- [x] **KI-Assistent — Pop-up & Zutaten-Speicherung:**
  - Modal-Pop-up (`z-[100]`, angepasste Abstände) wird nicht mehr vom Menü/Dock verdeckt.
  - Zutaten, die nicht zuhause sind und angeklickt werden, landen auf der Einkaufsliste.
  - Änderungen an Rezept & Zutaten werden dauerhaft in der **Rezept- & Zutaten-Übersicht** gespeichert (`updateRecipe`).
- [x] **KI-Assistent — Aufwärm-Box entfernen:** Die Box *„+ Morgen Mittag aufwärmen“* im KI-Assistenten entfernt.
- [x] **Gespeicherte Rezepte (Einklappen, Kategorien & Filter):**
  - Beinhaltet alle bereits eingeplanten Rezepte.
  - Standardmässig **eingeklappt** dargestellt.
  - Kategorisiert und filterbar nach **Ernährungsart** (`Fleisch`, `Vegi`) und **Dauer** (`≤ 20 Min.`, `21–35 Min.`, `> 35 Min.`).
- [x] **Essensabdeckung (28-Mahlzeiten-Logik & Kalender-Prüfung):**
  - Vereinfachte Gesamtübersicht über abgedeckte Mahlzeiten (unabhängig ob Mittag oder Abend): **7 Tage × 2 Mahlzeiten × 2 Personen = 28 Mahlzeiten**.
  - **Kalender-Abgleich:** Prüft automatisch im Kalender, ob jemand bereits einen Abendplan/Termin (ab 17:00 Uhr) hat – und zieht entsprechend 1 Portion pro verplanter Person ab.
- [x] **Essensplanung editierbar & verschiebbar:** Geplante Gerichte im Wochenplan nachträglich editierbar und direkt auf andere Tage verschiebbar gemacht.
- [x] Portionen-Stepper (`- / +`) & automatische Kalendersynchronisation (Kategorie `Essen`).

---

## 📅 Reiter: Kalender (`/calendar`)

### Offene Aufgaben (Google Kalender 2-Wege-Sync — Infrastruktur):
- [ ] **Google Cloud Console Projekt** erstellen und **Google Calendar API** aktivieren.
- [ ] **Service Account** anlegen, JSON-Schlüssel herunterladen und bestehenden Familienkalender für die Service-Account-E-Mail freigeben (*Termine ändern*).
- [ ] Umgebungsvariablen in Vercel hinterlegen (`GOOGLE_CALENDAR_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`) und 2-Wege-Sync im Live-Betrieb testen.

### Bereits abgeschlossen:
- [x] **Intelligente Uhrzeit-Logik:**
  - Wenn die Startzeit (**„von“**) angepasst wird, wird die Endzeit (**„bis“**) automatisch auf **1 Stunde später** gesetzt.
  - Uhrzeit-Auswahl auf **15-Minuten-Schritte** (`00`, `15`, `30`, `45`) begrenzt.
- [x] **Keine manuellen Kategorien:** Kategorien aus anderen Reitern (`Essen`, `ToDo`, `Ausflüge`) sind nicht manuell auswählbar; kein Kategorie-Auswahlfeld beim manuellen Termin-Erstellen.
- [x] **Neues Farbkonzept im Kalender:**
  - Dedizierte Farben für die automatisch generierten Kalendereinträge (`Essen`, `ToDo`, `Ausflüge`).
  - Für reguläre Termine jeweils die definierte Farbe der betroffenen Person (`Sandro`, `Jenni`, `Chiara`).
  - Sobald **mehr als 1 Person** betroffen ist, wird **Grau** (`#64748B`) verwendet.
- [x] **Chiara immer sichtbar:** Termine von **Chiara** werden im Kalender immer angezeigt (auch wenn auf Sandro oder Jenni gefiltert wird).
- [x] **Toggle für automatische Einträge:** Automatisch generierte Einträge (`Essen`, `ToDo`, `Ausflüge`) per Schalter ein- und ausblendbar gemacht (**Default: ausgeblendet**).
- [x] Interaktive Monatskalenderansicht (`Mo–So` Matrix) mit Tages-Inspektor.
- [x] API-Route (`src/app/api/calendar/google-sync/route.ts`) für 2-Wege-Synchronisation vorbereitet.

---

## ✅ Reiter: ToDos (`/todos`)

### Bereits abgeschlossen:
- [x] **Erledigen für alle Personen:** Jedes Familienmitglied kann jedes ToDo (auch wenn es einer anderen Person zugewiesen ist) als erledigt markieren (inkl. synchronisiertem State-/Supabase-Fix).
- [x] **Personenwechsel direkt per Klick:** Klick auf die zugewiesene Person in der ToDo-Übersicht (und auf dem Home-Screen) öffnet direkt die Auswahl für eine andere Person oder „Offen für alle“.
- [x] **Rückgängig-Funktion (`Undo`):** Versehentlich abgehakte ToDos lassen sich sowohl über den Sofort-Undo-Banner als auch dauerhaft in der Liste (`↩ Rückgängig`) wieder öffnen.
- [x] **Kompakte ToDo-Eingabe:** Das Erfassungsformular oben wurde als kompakte 2-zeilige Quick-Add-Leiste umgebaut, sodass die ToDo-Liste sofort sichtbar ist ohne weit nach unten scrollen zu müssen.
- [x] **ToDos editierbar machen:** Bestehende Aufgaben nachträglich bearbeitbar gemacht (**Titel, Zuständigkeit, Priorität, Deadline, Notiz**).
- [x] **Sortierung nach Priorität & Deadline:** Die ToDo-Übersicht nach **Priorität** und **Deadline** sortierbar gemacht.
- [x] Kategorien (`Kita`, `Haushalt`, `Familie` + eigene Kategorien).
- [x] Automatische Synchronisation von ToDo-Deadlines in den Kalender.
- [x] Tochter **Chiara** von ToDo-Zuweisungen ausgeschlossen (nur Sandro, Jenni oder „Offen für alle“).

---

## 🧭 Reiter: Freizeit (`/leisure`)

### Bereits abgeschlossen:
- [x] **Event-Crawling mit Direktlinks:** Konkrete **gecrawlte Ereignisse/Veranstaltungen** aus den regionalen Portalen aufgelistet – inklusive direkter Verlinkung auf die Fundstellen-URL (`foundAtUrl`) des jeweiligen Events.
- [x] **Wetter- & Saison-Anpassung:** Vorschläge dynamisch an die **aktuellen Witterungen innerhalb der Woche** (7-Tage-Wetterbericht für 8624 Grüt ZH) sowie die **aktuelle Saison/Jahreszeit** angepasst.
- [x] Kuratierte Ausflugsziele im Zürcher Oberland (≤ 30 Min. ab 8624 Grüt ZH) & 1-Klick Kalender-Eintrag.

---

## 📦 Reiter: Bedarf (`/needs`)

### Bereits abgeschlossen:
- [x] **Listenansicht nach Priorität:** Darstellung als übersichtliche Listenansicht, standardmässig **absteigend nach Priorität** (`Hoch` → `Normal` → `Niedrig`) sortiert.
- [x] **Einträge editierbar machen:** Bestehende Bedarfs-Einträge nachträglich bearbeitbar gemacht (**Titel, Notiz, Priorität**).
- [x] Modul von „Galaxus“ in „Bedarf“ umbenannt & Basis-Listenfunktion eingerichtet.
