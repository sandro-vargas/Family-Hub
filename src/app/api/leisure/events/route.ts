import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export interface CrawledRegionalEvent {
  id: string;
  title: string;
  dateLabel: string;
  location: string;
  driveMinutesFromGruet: number;
  portalName: string;
  portalHomeUrl: string;
  foundAtUrl: string;
  weatherSuitability: 'sun' | 'rain' | 'any';
  seasonSuitability: ('spring' | 'summer' | 'autumn' | 'winter')[];
  description: string;
}

const PORTAL_SOURCES = [
  {
    name: 'Zürioberland Tourismus',
    url: 'https://www.zuerioberland-tourismus.ch/de/erleben/veranstaltungen.html',
    baseUrl: 'https://www.zuerioberland-tourismus.ch',
    defaultLocation: 'Zürcher Oberland',
    driveMinutes: 12,
  },
  {
    name: 'Jucker Farm Events (Juckerhof & Bächlihof)',
    url: 'https://www.juckerfarm.ch/erleben/events/',
    baseUrl: 'https://www.juckerfarm.ch',
    defaultLocation: 'Seegräben / Jona',
    driveMinutes: 8,
  },
  {
    name: 'Stadt Wetzikon Veranstaltungskalender',
    url: 'https://www.wetzikon.ch/stadtleben/veranstaltungen',
    baseUrl: 'https://www.wetzikon.ch',
    defaultLocation: 'Wetzikon ZH',
    driveMinutes: 6,
  },
  {
    name: 'Stadt Uster & Greifensee Events',
    url: 'https://www.uster.ch/veranstaltungen',
    baseUrl: 'https://www.uster.ch',
    defaultLocation: 'Uster / Greifensee',
    driveMinutes: 12,
  },
];

// Curated seasonal & weather-tagged regional events from the 4 portals (always available & merged with live HTML crawl)
const SEASONAL_PORTAL_EVENTS: CrawledRegionalEvent[] = [
  {
    id: 'ev-zo-1',
    title: 'Kürbisausstellung & Herbstmarkt auf dem Juckerhof Seegräben',
    dateLabel: 'Täglich geöffnet (Herbst-Saison)',
    location: 'Seegräben ZH',
    driveMinutesFromGruet: 8,
    portalName: 'Jucker Farm Events',
    portalHomeUrl: 'https://www.juckerfarm.ch/erleben/events/',
    foundAtUrl: 'https://www.juckerfarm.ch/erleben/kuerbisausstellung/',
    weatherSuitability: 'sun',
    seasonSuitability: ['autumn'],
    description:
      'Kunstvolle Kürbisskulpturen, Strohburg für Kleinkinder, Geissen-Gehege und hausgemachte Kürbissuppe mit Blick auf den Pfäffikersee.',
  },
  {
    id: 'ev-zo-2',
    title: 'Hof-Erlebnis, Geissen füttern & Naturspielplatz Juckerhof',
    dateLabel: 'Jedes Wochenende • 09:00–17:00 Uhr',
    location: 'Seegräben ZH',
    driveMinutesFromGruet: 8,
    portalName: 'Jucker Farm Events',
    portalHomeUrl: 'https://www.juckerfarm.ch/erleben/events/',
    foundAtUrl: 'https://www.juckerfarm.ch/hoefe/juckerhof/',
    weatherSuitability: 'sun',
    seasonSuitability: ['spring', 'summer', 'autumn', 'winter'],
    description:
      'Direkt ab Grüt in 8 Minuten erreichbar: Zwergziegen, Apfelgarten-Labyrinth und Hofrestaurant mit regionalen Produkten.',
  },
  {
    id: 'ev-zo-3',
    title: 'Dampf- & Erlebnisbahnen / Familien-Sonntag im Zürcher Oberland',
    dateLabel: 'Wochenend-Programm',
    location: 'Bauma / Hinwil',
    driveMinutesFromGruet: 16,
    portalName: 'Zürioberland Tourismus',
    portalHomeUrl: 'https://www.zuerioberland-tourismus.ch/de/erleben/veranstaltungen.html',
    foundAtUrl: 'https://www.zuerioberland-tourismus.ch/de/erleben/veranstaltungen.html',
    weatherSuitability: 'any',
    seasonSuitability: ['spring', 'summer', 'autumn'],
    description:
      'Historische Zugfahrten und Familien-Erlebnistage im Tösstal und rund um den Bachtel.',
  },
  {
    id: 'ev-zo-4',
    title: 'Sauriermuseum Aathal – Familienführung & Dino-Spurensuche',
    dateLabel: 'Di–So • 10:00–17:00 Uhr (Ideal bei Regen & Kälte)',
    location: 'Aathal-Seegräben',
    driveMinutesFromGruet: 7,
    portalName: 'Zürioberland Tourismus',
    portalHomeUrl: 'https://www.zuerioberland-tourismus.ch/de/erleben/veranstaltungen.html',
    foundAtUrl: 'https://sauriermuseum.ch/',
    weatherSuitability: 'rain',
    seasonSuitability: ['spring', 'summer', 'autumn', 'winter'],
    description:
      'Komplett überdachtes Museum mit echten Dinosaurier-Fossilien und Kinder-Ausgrabungsplatz – perfekt bei wechselhaftem Wetter.',
  },
  {
    id: 'ev-zo-5',
    title: 'Kinder- & Familienprogramm Kulturfabrik / Bibliothek Wetzikon',
    dateLabel: 'Laufende Wochenveranstaltungen',
    location: 'Wetzikon ZH',
    driveMinutesFromGruet: 6,
    portalName: 'Stadt Wetzikon Veranstaltungskalender',
    portalHomeUrl: 'https://www.wetzikon.ch/stadtleben/veranstaltungen',
    foundAtUrl: 'https://www.wetzikon.ch/stadtleben/veranstaltungen',
    weatherSuitability: 'rain',
    seasonSuitability: ['spring', 'summer', 'autumn', 'winter'],
    description:
      'Geschichtenzeit für Kleinkinder, Kasperlitheater, Familien-Treffs und Wochenmarkt im Zentrum Wetzikon.',
  },
  {
    id: 'ev-zo-6',
    title: 'Greifensee-Schifffahrt & Naturstation Silberweide (Erlebnistage)',
    dateLabel: 'Mi / Sa / So • Familien-Erlebnis',
    location: 'Uster / Mönchaltorf',
    driveMinutesFromGruet: 11,
    portalName: 'Stadt Uster & Greifensee Events',
    portalHomeUrl: 'https://www.uster.ch/veranstaltungen',
    foundAtUrl: 'https://www.silberweide.ch/veranstaltungen',
    weatherSuitability: 'sun',
    seasonSuitability: ['spring', 'summer', 'autumn'],
    description:
      'kinderwagentaugliche Holzstege durch das Moor, Wasserspielplatz und Beobachtungstürme direkt am oberen Greifensee.',
  },
  {
    id: 'ev-zo-7',
    title: 'Winterzauber, Eisfeld Wetzikon & Lichterweg Zürcher Oberland',
    dateLabel: 'Herbst / Winter Saisonprogramm',
    location: 'Wetzikon / Hinwil',
    driveMinutesFromGruet: 6,
    portalName: 'Stadt Wetzikon Veranstaltungskalender',
    portalHomeUrl: 'https://www.wetzikon.ch/stadtleben/veranstaltungen',
    foundAtUrl: 'https://www.wetzikon.ch/stadtleben/veranstaltungen',
    weatherSuitability: 'any',
    seasonSuitability: ['autumn', 'winter'],
    description:
      'Publikumseislaufen mit Laufhilfen für Kinder in der Kunsteisbahn Wetzikon und stimmungsvolle Winter-Events.',
  },
  {
    id: 'ev-zo-8',
    title: 'Bächlihof Jona – Geissenpark, Naturspielplatz & Hof-Events',
    dateLabel: 'Täglich • 09:00–17:30 Uhr',
    location: 'Rapperswil-Jona',
    driveMinutesFromGruet: 18,
    portalName: 'Jucker Farm Events',
    portalHomeUrl: 'https://www.juckerfarm.ch/erleben/events/',
    foundAtUrl: 'https://www.juckerfarm.ch/hoefe/baechlihof/',
    weatherSuitability: 'any',
    seasonSuitability: ['spring', 'summer', 'autumn', 'winter'],
    description:
      'Grosse gedeckte Event-Scheune, Heuhüpfburg, Zwergziegen und saisonale Hof-Veranstaltungen.',
  },
];

async function crawlPortalHtml(source: (typeof PORTAL_SOURCES)[number]): Promise<CrawledRegionalEvent[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(source.url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; FamilyHubGruetBot/1.0; +https://familyhub.local)',
      },
      next: { revalidate: 3600 },
    });
    clearTimeout(timeout);

    if (!res.ok) return [];
    const html = await res.text();
    const $ = cheerio.load(html);
    const extracted: CrawledRegionalEvent[] = [];

    $('a').each((_, el) => {
      if (extracted.length >= 3) return;
      const href = $(el).attr('href') || '';
      const rawTitle = $(el).find('h2, h3, h4, .title').first().text().trim() || $(el).text().trim();
      const cleanTitle = rawTitle.replace(/\s+/g, ' ').trim();

      if (
        cleanTitle.length >= 16 &&
        cleanTitle.length <= 95 &&
        !cleanTitle.toLowerCase().includes('cookie') &&
        !cleanTitle.toLowerCase().includes('datenschutz') &&
        !cleanTitle.toLowerCase().includes('impressum') &&
        !cleanTitle.toLowerCase().includes('anmelden') &&
        !cleanTitle.toLowerCase().includes('kontakt') &&
        (href.includes('event') ||
          href.includes('veranstaltung') ||
          href.includes('erleben') ||
          href.includes('ausstellung') ||
          href.includes('markt'))
      ) {
        const absoluteUrl = href.startsWith('http')
          ? href
          : `${source.baseUrl}${href.startsWith('/') ? '' : '/'}${href}`;

        if (!extracted.some((e) => e.title === cleanTitle || e.foundAtUrl === absoluteUrl)) {
          extracted.push({
            id: `crawled-${source.name}-${extracted.length}`,
            title: cleanTitle,
            dateLabel: 'Aktuell im Eventkalender',
            location: source.defaultLocation,
            driveMinutesFromGruet: source.driveMinutes,
            portalName: source.name,
            portalHomeUrl: source.url,
            foundAtUrl: absoluteUrl,
            weatherSuitability: 'any',
            seasonSuitability: ['spring', 'summer', 'autumn', 'winter'],
            description: `Live gecrawlt von ${source.name} (${source.defaultLocation}).`,
          });
        }
      }
    });

    return extracted;
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const crawledLists = await Promise.all(PORTAL_SOURCES.map((s) => crawlPortalHtml(s)));
    const liveCrawled = crawledLists.flat();

    // Combine live crawled events with curated portal events, deduplicating by URL/title
    const combined: CrawledRegionalEvent[] = [...liveCrawled];
    for (const item of SEASONAL_PORTAL_EVENTS) {
      if (!combined.some((c) => c.title.toLowerCase() === item.title.toLowerCase())) {
        combined.push(item);
      }
    }

    return NextResponse.json({
      events: combined,
      crawledAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({
      events: SEASONAL_PORTAL_EVENTS,
      crawledAt: new Date().toISOString(),
    });
  }
}
