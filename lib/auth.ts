import 'server-only';
import { cookies } from 'next/headers';
import { getConfig } from './config';

export const SESSION_COOKIE = 'mk_session';
export const SESSION_MAX_AGE_S = 60 * 60 * 24 * 30; // 30 dager

/** Lagertilgang: egen cookie med egen kode, kortere levetid enn kasse-økten. */
export const STOCK_COOKIE = 'mk_stock';
export const STOCK_MAX_AGE_S = 60 * 60 * 12; // 12 timer

// Ulikt prefiks per type, så en kasse-token aldri kan brukes som lager-token.
const SESSION_VERSION = 'v1';
const STOCK_VERSION = 'stock1';
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

/** NFC-normaliserer begge sider, så «å» tastet på iPhone og Android blir likt. */
export function verifyPin(pin: string): boolean {
  return safeEqual(pin.normalize('NFC'), getConfig().auth.pin.normalize('NFC'));
}

export function verifyStockPin(pin: string): boolean {
  const { stockPin } = getConfig().auth;
  return stockPin !== undefined && safeEqual(pin.normalize('NFC'), stockPin.normalize('NFC'));
}

/** Token: `<versjon>.<utløp i ms>.<HMAC-SHA256 av «<versjon>.<utløp>»>` */
async function createToken(version: string, maxAgeS: number, now: number): Promise<string> {
  const payload = `${version}.${now + maxAgeS * 1000}`;
  return `${payload}.${await sign(payload)}`;
}

async function verifyToken(expected: string, token: string | undefined, now: number): Promise<boolean> {
  if (!token) return false;
  const [version, expires, signature] = token.split('.');
  if (version !== expected || !expires || !signature) return false;
  if (!/^\d+$/.test(expires) || Number(expires) < now) return false;
  return safeEqual(signature, await sign(`${version}.${expires}`));
}

export const createSessionToken = (now = Date.now()) => createToken(SESSION_VERSION, SESSION_MAX_AGE_S, now);

export const verifySessionToken = (token: string | undefined, now = Date.now()) =>
  verifyToken(SESSION_VERSION, token, now);

export const createStockToken = (now = Date.now()) => createToken(STOCK_VERSION, STOCK_MAX_AGE_S, now);

/** Om denne enheten har låst opp lagerskjermen (og lagerskjermen er på). */
export async function hasStockAccess(): Promise<boolean> {
  if (getConfig().auth.stockPin === undefined) return false;
  return verifyToken(STOCK_VERSION, (await cookies()).get(STOCK_COOKIE)?.value, Date.now());
}

export const sessionCookieOptions = {
  httpOnly: true,
  // Safari godtar ikke secure-cookies på http://localhost
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_MAX_AGE_S,
};

export const stockCookieOptions = { ...sessionCookieOptions, maxAge: STOCK_MAX_AGE_S };
