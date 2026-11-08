import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const LEISURE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    suggestions: {
      type: 'array',
      description: '2 bis 4 konkrete Familien-Ausflugsvorschläge oder aufbereitete Events im Raum Zürcher Oberland (max. 30 Fahrminuten ab 8624 Grüt ZH).',
      items: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Name des Ausflugsziels oder Events (Schweizer Hochdeutsch).',
          },
          municipality: {
            type: 'string',
            description: 'Ort / Gemeinde (z.B. Seegräben ZH, Hinwil, Wetzikon, Rapperswil, Uster).',
          },
          drive_minutes_from_gruet: {
            type: 'integer',
            description: 'Geschätzte Fahrzeit mit dem Auto ab 8624 Grüt (Gossau ZH) in Minuten (maximal 30).',
          },
          category: {
            type: 'string',
            enum: ['outdoor', 'indoor', 'animals_nature', 'water_lake', 'culture_events'],
          },
          weather_suitability: {
            type: 'string',
            enum: ['sun', 'rain', 'any'],
          },
          age_recommendation: {
            type: 'string',
            description: 'Altersempfehlung / Kinderwagentauglichkeit.',
          },
          description: {
            type: 'string',
            description: 'Lebendige Beschreibung, warum sich der Ausflug für die Familie lohnt.',
          },
          tip: {
            type: 'string',
            description: 'Praktischer Familien-Tipp (Parkplatz, Verpflegung, Kinderwagen, Ticket).',
          },
          event_url: {
            type: 'string',
            description: 'Offizielle Webseite oder lokale Eventseite zum Nachschauen.',
          },
          suggested_start_time: {
            type: 'string',
            description: 'Empfohlene Startzeit im Format HH:MM (z.B. 10:00).',
          },
          suggested_end_time: {
            type: 'string',
            description: 'Empfohlene Endzeit im Format HH:MM (z.B. 15:00).',
          },
        },
        required: [
          'title',
          'municipality',
          'drive_minutes_from_gruet',
          'category',
          'weather_suitability',
          'age_recommendation',
          'description',
          'tip',
          'event_url',
          'suggested_start_time',
          'suggested_end_time',
        ],
      },
    },
  },
  required: ['suggestions'],
};

function buildSmartZueriOberlandFallback(prompt: string, weatherFilter: string) {
  const lower = prompt.toLowerCase();
  const isUrl = prompt.includes('http://') || prompt.includes('https://');

  if (isUrl) {
    let domain = 'zuerioberland-tourismus.ch';
    try {
      const urlMatch = prompt.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        domain = new URL(urlMatch[0]).hostname.replace(/^www\./, '');
      }
    } catch {
      // ignore
    }

    return [
      {
        title: `Familien-Event im Zürcher Oberland (${domain})`,
        municipality: 'Region Zürcher Oberland (ab Grüt ZH)',
        drive_minutes_from_gruet: 12,
        category: 'culture_events',
        weather_suitability: 'any',
        age_recommendation: 'Für die ganze Familie',
        description: `Aufbereiteter Event-Vorschlag aus deiner verlinkten Eventseite (${domain}). Perfekt zum direkten Übernehmen in den Familienkalender!`,
        tip: 'Öffnungszeiten und allfällige Ticketreservation kurz auf der verlinkten Eventseite prüfen.',
        event_url: prompt.match(/https?:\/\/[^\s]+/)?.[0] || 'https://www.zuerioberland-tourismus.ch/de/erleben/veranstaltungen.html',
        suggested_start_time: '10:00',
        suggested_end_time: '14:30',
      },
    ];
  }

  if (lower.includes('regen') || lower.includes('indoor') || lower.includes('schlecht') || weatherFilter === 'rain') {
    return [
      {
        title: 'Sauriermuseum Aathal & Indoor-Dino-Welt',
        municipality: 'Aathal-Seegräben',
        drive_minutes_from_gruet: 7,
        category: 'indoor',
        weather_suitability: 'rain',
        age_recommendation: 'Ab 2 Jahren (kinderwagentauglich mit Lift)',
        description: 'Riesige echte Dinosaurier-Skelette, interaktive Ausgrabungsstation für Kinder und gemütliche Cafeteria – nur 7 Minuten von Grüt entfernt.',
        tip: 'Bei Regenwetter am Wochenende am besten gleich zur Öffnung um 10:00 Uhr hinfahren.',
        event_url: 'https://sauriermuseum.ch/',
        suggested_start_time: '10:00',
        suggested_end_time: '13:30',
      },
      {
        title: 'Milandia Greifensee / Hallenbad & Familien-Erlebnis',
        municipality: 'Greifensee / Uster',
        drive_minutes_from_gruet: 15,
        category: 'indoor',
        weather_suitability: 'rain',
        age_recommendation: 'Ab 1 Jahr',
        description: 'Warmes Kinderplanschbecken, Kletter- und Spielmöglichkeiten für jedes Wetter in unmittelbarer Nähe.',
        tip: 'Badesachen und Rutschsocken für die Kleine einpacken.',
        event_url: 'https://www.uster.ch/veranstaltungen',
        suggested_start_time: '09:30',
        suggested_end_time: '13:00',
      },
      {
        title: 'Swiss Science Center Technorama Winterthur',
        municipality: 'Winterthur',
        drive_minutes_from_gruet: 28,
        category: 'indoor',
        weather_suitability: 'rain',
        age_recommendation: 'Ab 3 Jahren',
        description: 'Spannende Wasser-, Klang- und Lichtexperimente zum selber Kurbeln und Ausprobieren.',
        tip: 'Über die A15/A1 in knapp 28 Minuten ab Grüt erreichbar.',
        event_url: 'https://www.technorama.ch/',
        suggested_start_time: '10:00',
        suggested_end_time: '15:30',
      },
    ];
  }

  return [
    {
      title: 'Juckerhof Seegräben & Naturspielplatz am Pfäffikersee',
      municipality: 'Seegräben ZH',
      drive_minutes_from_gruet: 8,
      category: 'animals_nature',
      weather_suitability: 'sun',
      age_recommendation: 'Ab 1 Jahr (ideal für Kleinkinder)',
      description: 'Geissen füttern, Barfusspfad, Naturspielplatz und frische Hof-Spezialitäten mit herrlichem Blick über den Pfäffikersee.',
      tip: 'Mit kurzem Kinderwagen-Spaziergang zum Seequai Pfäffikon kombinierbar.',
      event_url: 'https://www.juckerfarm.ch/hoefe/juckerhof/',
      suggested_start_time: '09:30',
      suggested_end_time: '13:30',
    },
    {
      title: 'Bachtel-Kulm & Waldspielplatz Orn',
      municipality: 'Hinwil / Orn',
      drive_minutes_from_gruet: 15,
      category: 'outdoor',
      weather_suitability: 'sun',
      age_recommendation: 'Alle Altersgruppen (kinderwagentauglich ab Orn)',
      description: 'Familienwanderung ab Orn auf den Bachtel mit grossem Spielplatz, Aussichtsturm und Zvieri im Bergrestaurant.',
      tip: 'Der Weg ab Parkplatz Orn ist breit und kinderwagentauglich.',
      event_url: 'https://www.bachtel-kulm.ch/',
      suggested_start_time: '10:30',
      suggested_end_time: '15:00',
    },
    {
      title: 'Knies Kinderzoo & Seepromenade Rapperswil',
      municipality: 'Rapperswil-Jona',
      drive_minutes_from_gruet: 20,
      category: 'animals_nature',
      weather_suitability: 'any',
      age_recommendation: 'Ab 1 Jahr',
      description: 'Ponys, Elefanten, Zwergziegen-Gehege zum Hineingehen und Rösslitram-Fahrt direkt am oberen Zürichsee.',
      tip: 'Über die A15 ab Hinwil in nur 20 Minuten erreichbar.',
      event_url: 'https://www.knieskinderzoo.ch/',
      suggested_start_time: '10:00',
      suggested_end_time: '15:30',
    },
  ];
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const prompt: string = body.prompt || 'Familienausflug am Wochenende mit Kleinkind';
    const weatherFilter: string = body.weatherFilter || 'any';
    const seasonLabel: string = body.seasonLabel || 'Herbst';
    const weeklyWeatherSummary: string = body.weeklyWeatherSummary || '';

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const hasValidKey = Boolean(apiKey && !apiKey.includes('dein-'));

    if (!hasValidKey) {
      return NextResponse.json({
        suggestions: buildSmartZueriOberlandFallback(prompt, weatherFilter),
        source: 'smart-zuerioberland-fallback',
      });
    }

    const client = new GoogleGenAI({ apiKey });

    const systemPrompt = `Du bist der lokale Familien-Freizeitplaner für eine junge Familie (Eltern + kleine Tochter Chiara) mit Wohnort 8624 Grüt (Gossau ZH) im Zürcher Oberland.
Aktuelle Saison: ${seasonLabel}.
Wochenwetter-Prognose für 8624 Grüt ZH: ${weeklyWeatherSummary || 'Wechselhaft'}.
Passe deine Vorschläge gezielt an die aktuelle Witterung innerhalb der Woche und die aktuelle Saison (${seasonLabel}) an!
Schlage ausschliesslich reale, familienfreundliche Ausflugsziele, Spielplätze, Tierparks, Museen, Seen oder Veranstaltungen vor, die maximal 30 Autominuten von 8624 Grüt (ZH) entfernt liegen (z.B. Gossau ZH, Wetzikon, Seegräben, Pfäffikon ZH, Hinwil/Bachtel, Uster/Greifensee, Mönchaltorf, Rapperswil-Jona, Atzmännig/Goldingen, Bubikon, Rüti, Winterthur).
Falls der Benutzer einen Link oder Text einer lokalen Eventseite eingibt, bereite den Event sauber für den Familienkalender auf.
Verwende Schweizer Hochdeutsch und gib echte, funktionierende Webseiten-URLs (z.B. zuerioberland-tourismus.ch, juckerfarm.ch, sauriermuseum.ch, knieskinderzoo.ch, bachtel-kulm.ch, wetzikon.ch, uster.ch) an.`;

    const interaction = await client.interactions.create({
      model: 'gemini-3.8-flash',
      system_instruction: systemPrompt,
      input: `Wunsch / Anfrage der Familie: "${prompt}" (Wetter-Filter: ${weatherFilter}, Saison: ${seasonLabel}, Wochenwetter: ${weeklyWeatherSummary}, max. 30 Min. ab 8624 Grüt ZH).`,
      response_format: {
        type: 'text',
        mime_type: 'application/json',
        schema: LEISURE_JSON_SCHEMA,
      },
    });

    const parsed = JSON.parse(interaction.output_text || '{}');

    return NextResponse.json({
      suggestions: parsed.suggestions || buildSmartZueriOberlandFallback(prompt, weatherFilter),
      source: 'gemini-3.8-flash',
    });
  } catch (error: any) {
    console.error('Gemini leisure planner error:', error);
    return NextResponse.json({
      suggestions: buildSmartZueriOberlandFallback('Familienausflug', 'any'),
      source: 'fallback-on-error',
    });
  }
}

