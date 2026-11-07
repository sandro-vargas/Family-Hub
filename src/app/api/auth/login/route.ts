import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, generateSessionToken, getExpectedPasscode } from '@/lib/auth';

// In-memory sliding rate limiter: max 5 failed attempts per IP within 15 minutes
interface RateLimitRecord {
  attempts: number;
  blockedUntil?: number;
}
const failedAttempts = new Map<string, RateLimitRecord>();

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = request.headers.get('x-real-ip');
  return realIp || 'unknown-client';
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const now = Date.now();

  const record = failedAttempts.get(ip);
  if (record?.blockedUntil && record.blockedUntil > now) {
    const remainingMinutes = Math.ceil((record.blockedUntil - now) / 60000);
    return NextResponse.json(
      {
        success: false,
        error: `Zu viele Fehlversuche. Zugang gesperrt für noch ${remainingMinutes} Minute(n).`,
      },
      { status: 429 }
    );
  }

  // Artificial delay (300ms) to stop automated brute-force timing attacks
  await new Promise((resolve) => setTimeout(resolve, 300));

  try {
    const body = await request.json();
    const passcode = (body.passcode || '').toString().trim();
    const expected = getExpectedPasscode().trim();

    if (!passcode || passcode !== expected) {
      const currentAttempts = (record?.attempts || 0) + 1;
      if (currentAttempts >= 5) {
        failedAttempts.set(ip, {
          attempts: currentAttempts,
          blockedUntil: now + 15 * 60 * 1000, // 15 minutes lockout
        });
        return NextResponse.json(
          {
            success: false,
            error: '5 Mal falscher Code eingegeben. Dieser Zugang ist für 15 Minuten gesperrt.',
          },
          { status: 429 }
        );
      } else {
        failedAttempts.set(ip, { attempts: currentAttempts });
        const remaining = 5 - currentAttempts;
        return NextResponse.json(
          {
            success: false,
            error: `Falscher Familien-Code. Noch ${remaining} Versuch(e).`,
          },
          { status: 401 }
        );
      }
    }

    // Success: reset attempts
    failedAttempts.delete(ip);

    const token = await generateSessionToken(expected);
    const response = NextResponse.json({ success: true });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Serverfehler beim Login' },
      { status: 500 }
    );
  }
}
