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

export async function GET() {
  // 8624 Grüt (Gossau ZH) Coordinates
  const lat = 47.2972;
  const lon = 8.7611;

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=Europe%2FZurich&forecast_days=1`;

    const res = await fetch(url, {
      next: { revalidate: 1800 }, // 30 minutes cache
    });

    if (!res.ok) {
      throw new Error(`Open-Meteo returned ${res.status}`);
    }

    const data = await res.json();
    const code = data.current?.weather_code ?? 1;

    const currentHour = new Date().getHours();
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

    return NextResponse.json({
      location: '8624 Grüt (ZH)',
      temperature: Math.round(data.current?.temperature_2m ?? 16),
      weatherCode: code,
      conditionLabel: WEATHER_LABELS[code] || 'Freundlich',
      tempMin: Math.round(data.daily?.temperature_2m_min?.[0] ?? 9),
      tempMax: Math.round(data.daily?.temperature_2m_max?.[0] ?? 19),
      windSpeed: Math.round(data.current?.wind_speed_10m ?? 8),
      hourlyForecast,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({
      location: '8624 Grüt (ZH)',
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
      updatedAt: new Date().toISOString(),
    });
  }
}

