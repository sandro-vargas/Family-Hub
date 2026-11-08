import { NextResponse } from 'next/server';

const WEATHER_LABELS: Record<number, string> = {
  0: 'Sonnig & klar',
  1: 'Überwiegend sonnig',
  2: 'Teilweise bewölkt',
  3: 'Bedeckt',
  45: 'Nebel',
  48: 'Reifnebel',
  51: 'Leichter Nieselregen',
  53: 'Nieselregen',
  61: 'Leichter Regen',
  63: 'Mässiger Regen',
  65: 'Starker Regen',
  71: 'Leichter Schneefall',
  73: 'Schneefall',
  80: 'Regenschauer',
  95: 'Gewitter',
};

function getCurrentSeason(monthZeroIndexed: number): {
  id: 'spring' | 'summer' | 'autumn' | 'winter';
  label: string;
} {
  if (monthZeroIndexed >= 2 && monthZeroIndexed <= 4) {
    return { id: 'spring', label: 'Frühling' };
  }
  if (monthZeroIndexed >= 5 && monthZeroIndexed <= 7) {
    return { id: 'summer', label: 'Sommer' };
  }
  if (monthZeroIndexed >= 8 && monthZeroIndexed <= 10) {
    return { id: 'autumn', label: 'Herbst' };
  }
  return { id: 'winter', label: 'Winter' };
}

function isRainyCode(code: number): boolean {
  return code >= 51;
}

export async function GET() {
  // 8624 Grüt (Gossau ZH) Coordinates
  const lat = 47.2972;
  const lon = 8.7611;
  const now = new Date();
  const season = getCurrentSeason(now.getMonth());

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Europe%2FZurich&forecast_days=7`;

    const res = await fetch(url, {
      next: { revalidate: 1800 }, // 30 minutes cache
    });

    if (!res.ok) {
      throw new Error(`Open-Meteo returned ${res.status}`);
    }

    const data = await res.json();
    const code = data.current?.weather_code ?? 1;

    const currentHour = now.getHours();
    const hourlyTimes: string[] = data.hourly?.time || [];
    const hourlyTemps: number[] = data.hourly?.temperature_2m || [];
    const hourlyCodes: number[] = data.hourly?.weather_code || [];

    const hourlyForecast = hourlyTimes
      .map((t, idx) => ({
        time: t.split('T')[1]?.slice(0, 5) || '12:00',
        hourNum: Number(t.split('T')[1]?.slice(0, 2) || 0),
        temp: Math.round(hourlyTemps[idx] ?? 15),
        code: hourlyCodes[idx] ?? 1,
      }))
      .filter((h) => h.hourNum >= currentHour)
      .slice(0, 5)
      .map(({ time, temp, code: c }) => ({ time, temp, code: c }));

    const dailyDates: string[] = data.daily?.time || [];
    const dailyMax: number[] = data.daily?.temperature_2m_max || [];
    const dailyMin: number[] = data.daily?.temperature_2m_min || [];
    const dailyCodes: number[] = data.daily?.weather_code || [];
    const dailyPrecip: number[] = data.daily?.precipitation_probability_max || [];

    const dailyForecast = dailyDates.map((dateIso, idx) => {
      const c = dailyCodes[idx] ?? 1;
      const rainProb = dailyPrecip[idx] ?? 10;
      const rainLikely = isRainyCode(c) || rainProb >= 55;
      return {
        date: dateIso,
        tempMax: Math.round(dailyMax[idx] ?? 16),
        tempMin: Math.round(dailyMin[idx] ?? 8),
        weatherCode: c,
        conditionLabel: WEATHER_LABELS[c] || 'Freundlich',
        precipProbability: rainProb,
        recommendedWeatherMode: rainLikely ? 'rain' : 'sun',
      };
    });

    return NextResponse.json({
      location: '8624 Grüt (ZH)',
      season: season.id,
      seasonLabel: season.label,
      temperature: Math.round(data.current?.temperature_2m ?? 16),
      weatherCode: code,
      conditionLabel: WEATHER_LABELS[code] || 'Freundlich',
      tempMin: Math.round(data.daily?.temperature_2m_min?.[0] ?? 9),
      tempMax: Math.round(data.daily?.temperature_2m_max?.[0] ?? 19),
      windSpeed: Math.round(data.current?.wind_speed_10m ?? 8),
      hourlyForecast,
      dailyForecast,
      updatedAt: now.toISOString(),
    });
  } catch {
    return NextResponse.json({
      location: '8624 Grüt (ZH)',
      season: season.id,
      seasonLabel: season.label,
      temperature: 15,
      weatherCode: 2,
      conditionLabel: 'Teilweise bewölkt',
      tempMin: 9,
      tempMax: 18,
      windSpeed: 10,
      hourlyForecast: [
        { time: '12:00', temp: 16, code: 1 },
        { time: '15:00', temp: 18, code: 2 },
        { time: '18:00', temp: 14, code: 2 },
        { time: '21:00', temp: 11, code: 0 },
      ],
      dailyForecast: [],
      updatedAt: now.toISOString(),
    });
  }
}
