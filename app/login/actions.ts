'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions, STOCK_COOKIE, verifyPin } from '@/lib/auth';

export type LoginState = { error?: string };

const WRONG_PIN_DELAY_MS = 700;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const pin = String(formData.get('pin') ?? '').trim();

  if (!verifyPin(pin)) {
    // Bremser gjetting litt uten å gjøre det tregt for selgeren.
    await new Promise((r) => setTimeout(r, WRONG_PIN_DELAY_MS));
    return { error: 'Feil kode. Prøv igjen.' };
  }

  (await cookies()).set(SESSION_COOKIE, await createSessionToken(), sessionCookieOptions);
  redirect('/');
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(STOCK_COOKIE);
  redirect('/login');
}
