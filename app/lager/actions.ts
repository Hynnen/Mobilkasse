'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createStockToken, STOCK_COOKIE, stockCookieOptions, verifyStockPin } from '@/lib/auth';

export type UnlockState = { error?: string };

const WRONG_PIN_DELAY_MS = 700;

export async function unlockStock(_prev: UnlockState, formData: FormData): Promise<UnlockState> {
  const pin = String(formData.get('pin') ?? '').trim();

  if (!verifyStockPin(pin)) {
    await new Promise((r) => setTimeout(r, WRONG_PIN_DELAY_MS));
    return { error: 'Feil kode. Prøv igjen.' };
  }

  (await cookies()).set(STOCK_COOKIE, await createStockToken(), stockCookieOptions);
  redirect('/lager');
}

/** Låser lagerskjermen igjen på denne enheten (kassen er fortsatt innlogget). */
export async function lockStock(): Promise<void> {
  (await cookies()).delete(STOCK_COOKIE);
  redirect('/');
}
