import 'server-only';
import { z } from 'zod';
import { checkStock, expireCatalog, itemKey, refreshCatalogInBackground, type SaleLine, type StockProblem } from './catalog';
import { WooError } from './woo';

/** Kurvlinjer fra kassen (salg og nye varer ved bytte). */
export const saleLinesSchema = z
  .array(
    z.object({
      productId: z.number().int().positive(),
      variationId: z.number().int().nonnegative(),
      quantity: z.number().int().min(1).max(99),
    }),
  )
  .max(50);

export type CartRejection =
  | { ok: false; error: 'insufficient_stock'; message: string; problems: StockProblem[] }
  | { ok: false; error: 'price_changed'; message: string; totalOre: number }
  | { ok: false; error: 'woo_error'; message: string };

/** Slår sammen linjer for samme vare, så lagersjekken ser riktig antall. */
export function mergeLines(lines: SaleLine[]): SaleLine[] {
  const merged = new Map<string, SaleLine>();
  for (const l of lines) {
    const key = itemKey(l.productId, l.variationId);
    const existing = merged.get(key);
    if (existing) existing.quantity += l.quantity;
    else merged.set(key, { ...l });
  }
  return [...merged.values()];
}

/**
 * Sjekker ferskt lager og at selgeren har vist kunden riktig beløp.
 * REST API-et stopper ikke salg ved for lite lager, så det må gjøres her.
 */
export async function verifyCart(
  lines: SaleLine[],
  expectedTotalOre: number,
): Promise<{ ok: true; totalOre: number } | { ok: false; status: number; body: CartRejection }> {
  let stock;
  try {
    stock = await checkStock(lines);
  } catch (err) {
    console.error('[checkout] lagersjekk', err);
    return {
      ok: false,
      status: 502,
      body: { ok: false, error: 'woo_error', message: 'Fikk ikke kontakt med nettbutikken. Ingenting er registrert.' },
    };
  }

  if (!stock.ok) {
    refreshCatalogInBackground();
    return {
      ok: false,
      status: 409,
      body: { ok: false, error: 'insufficient_stock', message: 'For lite på lager.', problems: stock.problems },
    };
  }

  if (stock.totalOre !== expectedTotalOre) {
    expireCatalog(); // kassen må hente nye priser, ikke lagrede
    return {
      ok: false,
      status: 409,
      body: { ok: false, error: 'price_changed', message: 'Prisen er endret. Sjekk beløpet med kunden.', totalOre: stock.totalOre },
    };
  }

  return { ok: true, totalOre: stock.totalOre };
}

/** Ved tidsavbrudd/nettverksfeil vet vi ikke om skrivekallet ble utført i WooCommerce. */
export const outcomeUnknown = (err: unknown) =>
  err instanceof WooError && (err.code === 'timeout' || err.code === 'network_error');
