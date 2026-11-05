import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const RECIPE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      description: 'Name des Gerichts auf Schweizer Hochdeutsch (z.B. Schnitzel mit Pommes Frites oder Poulet-Curry).',
    },
    description: {
      type: 'string',
      description: 'Kurze, appetitliche Beschreibung des Familiengerichts.',
    },
    planned_day_hint: {
      type: 'string',
      description: 'Falls im Prompt ein Wochentag genannt wurde (z.B. Dienstag), sonst leer.',
    },
    portions: {
      type: 'integer',
      description: 'Berechnete Portionenanzahl (Standard 4-5 Portionen für Abendessen + Mittagessen am Folgetag).',
    },
    prep_time_minutes: {
      type: 'integer',
      description: 'Zubereitungszeit in Minuten.',
    },
    cooking_method: {
      type: 'string',
      enum: ['standard', 'thermomix'],
      description: 'Ob das Rezept herkömmlich oder für den Thermomix (TM6) erstellt wurde.',
    },
    instructions: {
      type: 'array',
      items: { type: 'string' },
      description: 'Klare Schritt-für-Schritt Zubereitungsschritte.',
    },
    thermomix_steps: {
      type: 'array',
      description: 'Falls cooking_method == thermomix: detaillierte Thermomix-Schritte mit Zeit, Temperatur und Stufe.',
      items: {
        type: 'object',
        properties: {
          step_number: { type: 'integer' },
          title: { type: 'string' },
          instruction: { type: 'string' },
          time_setting: { type: 'string', description: 'z.B. 5 Sek. oder 12 Min.' },
          temp_setting: { type: 'string', description: 'z.B. 100 °C, 120 °C oder Varoma' },
          speed_setting: { type: 'string', description: 'z.B. Stufe 4 oder Stufe 1, Linkslauf' },
        },
        required: ['step_number', 'title', 'instruction'],
      },
    },
    ingredients: {
      type: 'array',
      description: 'Vollständige Zutatenliste exakt skaliert auf die gewünschte Portionenanzahl.',
      items: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Schweizer Bezeichnung der Zutat (z.B. Rüebli, Vollrahm, Pouletbrust).',
          },
          normalized_name: {
            type: 'string',
            description: 'Kleingeschriebener Singular-Basisname zum Zusammenfassen auf der Einkaufsliste.',
          },
          quantity: {
            type: 'number',
            description: 'Numerische Menge.',
          },
          unit: {
            type: 'string',
            description: 'Einheit wie g, ml, Stk, EL, TL, Bund.',
          },
          store_category_slug: {
            type: 'string',
            enum: [
              'produce',
              'bakery',
              'meat_fish',
              'dairy_eggs',
              'pantry',
              'spices_oils',
              'frozen',
              'beverages',
              'household_care',
              'other',
            ],
            description: 'Passende Abteilung in Migros / Coop.',
          },
          is_pantry_staple: {
            type: 'boolean',
            description: 'true für typische Vorratszutaten wie Salz, Pfeffer, Rapsöl, Bratbutter, Bouillon.',
          },
        },
        required: [
          'name',
          'normalized_name',
          'quantity',
          'unit',
          'store_category_slug',
          'is_pantry_staple',
        ],
      },
    },
  },
  required: [
    'title',
    'description',
    'portions',
    'prep_time_minutes',
    'cooking_method',
    'instructions',
    'ingredients',
  ],
};

function buildSmartFallbackRecipe(
  prompt: string,
  portions: number,
  cookingMethod: 'standard' | 'thermomix'
) {
  const lower = prompt.toLowerCase();
  const scale = portions / 4;

  // Cleanup day names from title
  const cleanedTitle = prompt
    .replace(/^(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|heute|morgen)\s*:?\s*/i, '')
    .trim();

  if (lower.includes('schnitzel') || lower.includes('pommes')) {
    return {
      title: cleanedTitle || 'Knusprige Schnitzel mit Ofen-Pommes & Gurkensalat',
      description: `Familien-Klassiker abgestimmt auf ${portions} Portionen (ideal auch zum Aufwärmen am nächsten Mittag).`,
      planned_day_hint: '',
      portions,
      prep_time_minutes: 35,
      cooking_method: cookingMethod,
      instructions: [
        'Backofen auf 220 °C Umluft vorheizen und die Pommes Frites auf einem Backblech verteilen (ca. 25 Min. goldbraun backen).',
        'Schnitzel trocken tupfen, würzen und nacheinander in Mehl, verquirltem Ei und Paniermehl wenden.',
        'In reichlich heisser Bratbutter beidseitig je 3–4 Minuten goldbraun braten.',
        'Salatgurke hobeln, mit Rahm, Zitronensaft, Dill, Salz und Pfeffer zu einem frischen Gurkensalat mischen.',
      ],
      thermomix_steps:
        cookingMethod === 'thermomix'
          ? [
              {
                step_number: 1,
                title: 'Paniermehl & Kräuter-Mix im Mixtopf',
                instruction: 'Altbackenes Brot mit etwas Petersilie in den Mixtopf geben und fein mahlen.',
                time_setting: '15 Sek.',
                speed_setting: 'Stufe 10',
              },
              {
                step_number: 2,
                title: 'Gurkensalat-Dressing rühren',
                instruction: '100 g Sauerrahm, 1 EL Zitronensaft, Dill, Salz und Pfeffer im Mixtopf verrühren.',
                time_setting: '10 Sek.',
                speed_setting: 'Stufe 3',
              },
            ]
          : [],
      ingredients: [
        { name: 'Schweins- oder Pouletschnitzel', normalized_name: 'schnitzel', quantity: Math.round(600 * scale), unit: 'g', store_category_slug: 'meat_fish', is_pantry_staple: false },
        { name: 'Ofen-Pommes Frites', normalized_name: 'pommes frites', quantity: Math.round(750 * scale), unit: 'g', store_category_slug: 'frozen', is_pantry_staple: false },
        { name: 'Salatgurke', normalized_name: 'salatgurke', quantity: Math.max(1, Math.round(1 * scale)), unit: 'Stk', store_category_slug: 'produce', is_pantry_staple: false },
        { name: 'Zitrone', normalized_name: 'zitrone', quantity: 1, unit: 'Stk', store_category_slug: 'produce', is_pantry_staple: false },
        { name: 'Eier (Freiland)', normalized_name: 'eier', quantity: Math.max(2, Math.round(2 * scale)), unit: 'Stk', store_category_slug: 'dairy_eggs', is_pantry_staple: true },
        { name: 'Paniermehl', normalized_name: 'paniermehl', quantity: Math.round(120 * scale), unit: 'g', store_category_slug: 'pantry', is_pantry_staple: true },
        { name: 'Bratbutter', normalized_name: 'bratbutter', quantity: 3, unit: 'EL', store_category_slug: 'spices_oils', is_pantry_staple: true },
      ],
    };
  }

  return {
    title: cleanedTitle || 'Familien-Gericht nach Wunsch',
    description: `Frisch zubereitet für ${portions} Portionen (${
      cookingMethod === 'thermomix' ? 'Thermomix TM6' : 'Herkömmlich gekocht'
    }).`,
    planned_day_hint: '',
    portions,
    prep_time_minutes: 30,
    cooking_method: cookingMethod,
    instructions: [
      'Frisches Gemüse waschen und mundgerecht rüsten.',
      'Hauptzutaten in einer grossen Pfanne mit etwas Bratbutter anbraten.',
      'Mit Bouillon und Rahm ablöschen und schonend gar ziehen lassen.',
      'Beilage nach Packungsangabe kochen, abschmecken und heiss servieren (Rest für morgen Mittag kühl stellen).',
    ],
    thermomix_steps:
      cookingMethod === 'thermomix'
        ? [
            {
              step_number: 1,
              title: 'Zwiebel & Knoblauch zerkleinern',
              instruction: 'Zwiebel und Knoblauchzehe in den Mixtopf geben und zerkleinern.',
              time_setting: '5 Sek.',
              speed_setting: 'Stufe 5',
            },
            {
              step_number: 2,
              title: 'Andünsten',
              instruction: '20 g Olivenöl zugeben und dünsten.',
              time_setting: '3 Min.',
              temp_setting: '120 °C',
              speed_setting: 'Stufe 1',
            },
            {
              step_number: 3,
              title: 'Hauptzutaten & Sauce garen',
              instruction: 'Gemüse, Bouillon und Rahm zugeben und im Linkslauf sanft garen.',
              time_setting: '15 Min.',
              temp_setting: '100 °C',
              speed_setting: 'Stufe 1, Linkslauf',
            },
          ]
        : [],
    ingredients: [
      { name: 'Frisches Saisongemüse (Rüebli / Zucchetti)', normalized_name: 'saisongemüse', quantity: Math.round(500 * scale), unit: 'g', store_category_slug: 'produce', is_pantry_staple: false },
      { name: 'Pouletgeschnetzeltes oder Tofu', normalized_name: 'pouletgeschnetzeltes', quantity: Math.round(500 * scale), unit: 'g', store_category_slug: 'meat_fish', is_pantry_staple: false },
      { name: 'Teigwaren oder Basmatireis', normalized_name: 'teigwaren', quantity: Math.round(400 * scale), unit: 'g', store_category_slug: 'pantry', is_pantry_staple: false },
      { name: 'Kochrahm', normalized_name: 'kochrahm', quantity: Math.round(250 * scale), unit: 'ml', store_category_slug: 'dairy_eggs', is_pantry_staple: false },
      { name: 'Zwiebeln', normalized_name: 'zwiebel', quantity: 1, unit: 'Stk', store_category_slug: 'produce', is_pantry_staple: true },
      { name: 'Gemüsebouillon & Gewürze', normalized_name: 'gemüsebouillon', quantity: 1, unit: 'EL', store_category_slug: 'spices_oils', is_pantry_staple: true },
    ],
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const prompt: string = body.prompt || 'Schnitzel mit Pommes';
    const portions: number = Number(body.portions) || 4;
    const cookingMethod: 'standard' | 'thermomix' =
      body.cookingMethod === 'thermomix' ? 'thermomix' : 'standard';

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const hasValidKey = Boolean(apiKey && !apiKey.includes('dein-gemini-api-key'));

    if (!hasValidKey) {
      return NextResponse.json({
        recipe: buildSmartFallbackRecipe(prompt, portions, cookingMethod),
        source: 'smart-local-fallback',
      });
    }

    const client = new GoogleGenAI({ apiKey });

    const systemPrompt = `Du bist der Schweizer Familien-Kochassistent für den Family Hub in 8624 Grüt (ZH).
Erstelle ein familienfreundliches Rezept auf Schweizer Hochdeutsch (nutze Begriffe wie Rüebli, Vollrahm, Poulet, Peperoni, Zucchetti, Bratbutter).
Skaliere alle Zutatenmengen exakt auf ${portions} Portionen (oft wird am Abend für 4-5 Portionen gekocht, damit es am nächsten Mittag aufgewärmt werden kann).
Gewünschte Zubereitungsart: ${
      cookingMethod === 'thermomix'
        ? 'Thermomix (TM6) – fülle zwingend thermomix_steps mit exakten Zeit-, Temperatur- und Stufen-Angaben inkl. Linkslauf/Varoma aus'
        : 'Herkömmliche Zubereitung (Pfanne / Ofen / Kochtopf)'
    }.
Ordne jede Zutat dem passenden Migros/Coop Abteilungs-Slug (store_category_slug) zu.`;

    const interaction = await client.interactions.create({
      model: 'gemini-3.8-flash',
      system_instruction: systemPrompt,
      input: `Benutzereingabe: "${prompt}" für ${portions} Portionen (${cookingMethod}).`,
      response_format: {
        type: 'text',
        mime_type: 'application/json',
        schema: RECIPE_JSON_SCHEMA,
      },
    });

    const parsed = JSON.parse(interaction.output_text || '{}');

    return NextResponse.json({
      recipe: parsed,
      source: 'gemini-3.8-flash',
    });
  } catch (error: any) {
    console.error('Gemini recipe generation error:', error);
    return NextResponse.json({
      recipe: buildSmartFallbackRecipe('Schnitzel mit Pommes', 4, 'standard'),
      source: 'fallback-on-error',
      errorHint: error?.message,
    });
  }
}

