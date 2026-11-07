import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, generateSessionToken, getExpectedPasscode } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const passcode = (body.passcode || '').toString().trim();
    const expected = getExpectedPasscode().trim();

    if (!passcode || passcode !== expected) {
      return NextResponse.json(
        { success: false, error: 'Falscher Familien-Code. Bitte erneut versuchen.' },
        { status: 401 }
      );
    }

    const token = generateSessionToken(expected);
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
