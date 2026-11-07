export const AUTH_COOKIE_NAME = 'family_hub_auth';
export const DEFAULT_FAMILY_PASSCODE = '8624';

export function getExpectedPasscode(): string {
  return process.env.FAMILY_PASSCODE || process.env.FAMILY_PIN || DEFAULT_FAMILY_PASSCODE;
}

export function generateSessionToken(passcode: string): string {
  if (typeof btoa === 'function') {
    return btoa(`family-hub:${passcode}:granted`);
  }
  return Buffer.from(`family-hub:${passcode}:granted`).toString('base64');
}

export function isValidSession(token: string | undefined | null): boolean {
  if (!token) return false;
  try {
    const expected = generateSessionToken(getExpectedPasscode());
    return token === expected;
  } catch {
    return false;
  }
}
