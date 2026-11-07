export const AUTH_COOKIE_NAME = 'family_hub_auth';
export const DEFAULT_FAMILY_PASSCODE = '8624';

const SECRET_SALT = 'family_hub_salt_v1_gruet_zh_2026_secure';

export function getExpectedPasscode(): string {
  return process.env.FAMILY_PASSCODE || process.env.FAMILY_PIN || DEFAULT_FAMILY_PASSCODE;
}

// Edge & Node.js compatible SHA-256 hex digest
export async function computePasscodeHash(passcode: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${SECRET_SALT}:::${passcode}:::granted`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function generateSessionToken(passcode: string): Promise<string> {
  const hash = await computePasscodeHash(passcode);
  return `fh_sec_${hash}`;
}

export async function isValidSession(token: string | undefined | null): Promise<boolean> {
  if (!token || !token.startsWith('fh_sec_')) return false;
  try {
    const expectedToken = await generateSessionToken(getExpectedPasscode());
    return token === expectedToken;
  } catch {
    return false;
  }
}
