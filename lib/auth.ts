import 'server-only';
import { getConfig } from './config';

export const SESSION_COOKIE = 'mk_session';
export const SESSION_MAX_AGE_S = 60 * 60 * 24 * 30; // 30 dager

const VERSION = 'v1';
const encoder = new TextEncoder();

function toBase64Url(bytes: ArrayBuffer): string {
  return Buffer.from(bytes).toString('base64url');
}

/** Sammenligning i konstant tid, så svartid ikke lekker hvor mange tegn som stemmer. */
function safeEqual(a: string, b: string): boolean {
  const x = encoder.encode(a);
  const y = encoder.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

let keyPromise: Promise<CryptoKey> | undefined;

function hmacKey(): Promise<CryptoKey> {
  keyPromise ??= crypto.subtle.importKey(
    'raw',
    encoder.encode(getConfig().auth.sessionSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return keyPromise;
}

async function sign(payload: string): Promise<string> {
  return toBase64Url(await crypto.subtle.sign('HMAC', await hmacKey(), encoder.encode(payload)));
}

export function verifyPin(pin: string): boolean {
  return safeEqual(pin, getConfig().auth.pin);
}

/** Token: `v1.<utløp i ms>.<HMAC-SHA256 av «v1.<utløp>»>` */
export async function createSessionToken(now = Date.now()): Promise<string> {
  const payload = `${VERSION}.${now + SESSION_MAX_AGE_S * 1000}`;
  return `${payload}.${await sign(payload)}`;
}

export async function verifySessionToken(token: string | undefined, now = Date.now()): Promise<boolean> {
  if (!token) return false;
  const [version, expires, signature] = token.split('.');
  if (version !== VERSION || !expires || !signature) return false;
  if (!/^\d+$/.test(expires) || Number(expires) < now) return false;
  return safeEqual(signature, await sign(`${version}.${expires}`));
}

export const sessionCookieOptions = {
  httpOnly: true,
  // Safari godtar ikke secure-cookies på http://localhost
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_MAX_AGE_S,
};
