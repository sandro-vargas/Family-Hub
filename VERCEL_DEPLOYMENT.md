# Vercel Deployment & Datenarchitektur-Leitfaden – Family Hub

Dieser Leitfaden erklärt die Bereitstellung auf **Vercel** sowie die Datenarchitektur (**Supabase vs. Lokaler Modus**).

---

## 1. Wo werden die Daten aktuell gespeichert?

Aktuell läuft die App in einer **robusten Hybrid-Architektur**:

1. **Aktueller Stand (Browser / LocalStorage & Multi-Tab Sync):**
   - Ohne Supabase-Zugangsdaten speichert die App alle Einträge (Einkaufsliste, Essensplan, ToDos, Bedarfsartikel, Kalendertermine) im verschlüsselten Browser-Speicher (`localStorage`).
   - Über das `storage`-Event synchronisieren sich mehrere offene Tabs auf demselben Gerät sofort in Echtzeit.
   - **Einschränkung für Vercel:** Wenn die App auf Vercel läuft, sieht Sandro auf seinem Handy vorerst nur die Daten seines Handys und Jenni auf ihrem Handy nur die Daten ihres Handys (weil der Browser-Speicher gerätegebunden ist).

2. **Mit Supabase (Gemeinsamer Familien-Echtzeit-Server):**
   - Sobald eine Supabase-Datenbank verbunden ist, laufen **alle Geräte** (Sandro, Jenni, Chiara, iPad-Wanddisplay) über **eine zentrale PostgreSQL-Datenbank**.
   - Trägt Jenni unterwegs in der Migros etwas auf die Einkaufsliste ein oder hakt Sandro ein ToDo ab, aktualisiert sich das iPad im Wohnzimmer per **Supabase Realtime** sofort live.

---

## 2. Brauchen wir eine Supabase-Datenbank?

> [!IMPORTANT]
> **Ja, für den echten Familienbetrieb auf mehreren Geräten (Handys + iPad) ist Supabase sehr zu empfehlen.**

- **Kosten:** Ein Supabase-Projekt ist im **Free Tier zu 100 % kostenlos** und reicht für eine Familie auf Jahre hinaus völlig aus (bis zu 500 MB Datenbank, unbegrenzte API-Requests, Realtime-Sockets).
- **Bereits vorbereitet:** Das komplette Schema mit allen Tabellen, Indizes und Sicherheitsregeln (RLS) ist bereits fertig im Projekt hinterlegt unter:
  `supabase/migrations/0001_initial_schema.sql`

---

## 3. Schritt-für-Schritt: Supabase in 2 Minuten einrichten

1. Gehe auf [supabase.com](https://supabase.com) und erstelle ein kostenloses Konto (oder logge dich mit GitHub ein).
2. Klicke auf **„New project“** (Name z. B. `Family Hub`, Region z. B. `Frankfurt (eu-central-1)` oder `Zurich (eu-central-2)`).
3. Öffne im linken Menü den **SQL Editor**, kopiere den Inhalt aus `supabase/migrations/0001_initial_schema.sql` hinein und klicke auf **„Run“**.
4. Kopiere unter **Project Settings → API**:
   - `Project URL`
   - `anon public key`

---

## 4. Bereitstellung auf Vercel (1-Klick)

Der Production-Build wurde erfolgreich verifiziert (`18/18 Seiten & API-Routen statisch bzw. server-rendered optimiert`).

### Schritt A: Git-Repository (GitHub oder GitLab)
Pushe das Projekt auf GitHub:
```bash
git add .
git commit -m "Family Hub: Android Redesign, Kalender & Vercel Vorbereitung"
git push
```

### Schritt B: Projekt in Vercel importieren
1. Gehe auf [vercel.com](https://vercel.com) und klicke auf **„Add New… → Project“**.
2. Wähle dein GitHub-Repository aus.
3. Vercel erkennt das Next.js-Projekt automatisch.

### Schritt C: Umgebungsvariablen in Vercel eintragen
Trage unter **Environment Variables** in Vercel zunächst die Basis-Schlüssel für Phase 1 ein:

| Variable | Woher / Zweck | Pflicht für Phase 1? |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Aus deinem Supabase Dashboard | **Empfohlen** (für Geräte-Sync) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Aus deinem Supabase Dashboard | **Empfohlen** (für Geräte-Sync) |
| `GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com) (Kostenlos) | **Ja** (für Rezept- & Freizeit-KI) |

> [!NOTE]
> **Offenes ToDo (Phase 2 - Google Calendar Service Account):**
> Die folgenden Variablen werden in einem zweiten Schritt konfiguriert, sobald die Google Cloud Console eingerichtet wird:
> 
> | Variable | Woher / Zweck | Status |
> | :--- | :--- | :--- |
> | `GOOGLE_CALENDAR_ID` | Eure Kalender-ID (z. B. `primary` oder `familie@...`) | ⏳ *Pendent für Schritt 2* |
> | `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Google Cloud Service Account E-Mail | ⏳ *Pendent für Schritt 2* |
> | `GOOGLE_PRIVATE_KEY` | Privater Schlüssel (`.pem` / private key) | ⏳ *Pendent für Schritt 2* |

4. Klicke auf **„Deploy“**. Nach ca. 60 Sekunden ist eure App unter `https://dein-projekt.vercel.app` live erreichbar!

