import { z } from 'zod';
import { refreshCatalogInBackground } from '@/lib/catalog';
import { mergeLines, outcomeUnknown, saleLinesSchema, verifyCart, type CartRejection } from '@/lib/checkout';
import { toOre } from '@/lib/money';
import { loadSale, planReturn, registerReturn } from '@/lib/returns';
import type { ReturnPick } from '@/lib/sales';
import { createOrder } from '@/lib/woo';

const returnSchema = z.object({
  orderId: z.number().int().positive(),
  returnLines: z
    .array(z.object({ lineId: z.number().int().positive(), quantity: z.number().int().min(1).max(99) }))
    .min(1)
    .max(50),
  /** Beløpet selgeren har sett, så kunden får tilbake det som ble vist */
  expectedReturnOre: z.number().int().nonnegative(),
  /** Bytte: nye varer kunden tar med seg. Tom = bare retur. */
  lines: saleLinesSchema.default([]),
  expectedTotalOre: z.number().int().nonnegative().default(0),
});

export type ReturnRequest = z.input<typeof returnSchema>;

export type ReturnResponse =
  | { ok: true; number: string; returnOre: number; newOrder: { number: string; totalOre: number } | null }
  | { ok: false; error: 'invalid' | 'not_found' | 'return_changed'; message: string }
  | CartRejection
  | { ok: false; error: 'woo_error' | 'sale_unknown' | 'return_unknown' | 'refund_failed'; message: string };

const json = (body: ReturnResponse, status: number) => Response.json(body, { status });

function mergePicks(picks: ReturnPick[]): ReturnPick[] {
  const merged = new Map<number, number>();
  for (const p of picks) merged.set(p.lineId, (merged.get(p.lineId) ?? 0) + p.quantity);
  return [...merged].map(([lineId, quantity]) => ({ lineId, quantity }));
}

/**
 * Retur og bytte. Returen registreres som refusjon på det opprinnelige salget
 * (varene går tilbake på lager, salget blir stående i rapportene). Pengene
 * betales tilbake manuelt på Vipps. Ved bytte opprettes først en ny ordre for
 * de nye varene, deretter refusjonen.
 */
export async function POST(request: Request) {
  if (!request.headers.get('content-type')?.includes('application/json')) {
    return json({ ok: false, error: 'invalid', message: 'Ugyldig forespørsel.' }, 415);
  }

  const parsed = returnSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return json({ ok: false, error: 'invalid', message: 'Ugyldig retur.' }, 400);
  }
  const { orderId, expectedReturnOre, expectedTotalOre } = parsed.data;
  const picks = mergePicks(parsed.data.returnLines);
  const lines = mergeLines(parsed.data.lines);
  const exchange = lines.length > 0;

  // 1) Ferskt salg: kan varene fortsatt returneres, og stemmer beløpet?
  let sale;
  try {
    sale = await loadSale(orderId);
  } catch (err) {
    console.error('[api/return] hent salg', err);
    return json({ ok: false, error: 'woo_error', message: 'Fikk ikke kontakt med nettbutikken. Ingenting er registrert.' }, 502);
  }
  if (!sale) return json({ ok: false, error: 'not_found', message: 'Fant ikke salget.' }, 404);

  const plan = planReturn(sale, picks);
  if (!plan.ok || plan.amountOre !== expectedReturnOre) {
    return json(
      { ok: false, error: 'return_changed', message: 'Salget er endret siden du åpnet det, kanskje returnert fra en annen telefon. Åpne det på nytt.' },
      409,
    );
  }

  // 2) Bytte: ferskt lager og riktig beløp for de nye varene
  let newOrder: { number: string; totalOre: number } | null = null;
  if (exchange) {
    const cart = await verifyCart(lines, expectedTotalOre);
    if (!cart.ok) return json(cart.body, cart.status);

    try {
      const order = await createOrder(
        lines.map((l) => ({ product_id: l.productId, variation_id: l.variationId, quantity: l.quantity })),
        `Bytte fra ordre ${sale.order.number}`,
      );
      newOrder = { number: order.number, totalOre: toOre(order.total) ?? cart.totalOre };
    } catch (err) {
      console.error('[api/return] opprett ny ordre', err);
      return json(
        outcomeUnknown(err)
          ? { ok: false, error: 'sale_unknown', message: 'Usikkert om byttet ble registrert. Sjekk ordrene i WooCommerce før du prøver igjen.' }
          : { ok: false, error: 'woo_error', message: 'Nettbutikken avviste byttet. Ingenting er registrert.' },
        502,
      );
    }
  }

  // 3) Refusjon på det opprinnelige salget. api_restock → lageret går opp igjen.
  try {
    await registerReturn(
      orderId,
      plan,
      newOrder ? `Byttet over disk, ny ordre ${newOrder.number}` : 'Returnert over disk, tilbakebetalt på Vipps',
    );
  } catch (err) {
    console.error('[api/return] refusjon', err);
    refreshCatalogInBackground();
    if (newOrder) {
      return json(
        {
          ok: false,
          error: 'refund_failed',
          message: `Ny ordre ${newOrder.number} er registrert, men returen på ordre ${sale.order.number} ble ikke lagret. Registrer returen fra «Siste salg».`,
        },
        502,
      );
    }
    return json(
      outcomeUnknown(err)
        ? { ok: false, error: 'return_unknown', message: 'Usikkert om returen ble registrert. Åpne salget på nytt og sjekk før du prøver igjen.' }
        : { ok: false, error: 'woo_error', message: 'Nettbutikken avviste returen. Ingenting er registrert.' },
      502,
    );
  }

  refreshCatalogInBackground(); // kassen legger returnerte varer tilbake lokalt i mellomtiden
  return json({ ok: true, number: sale.order.number, returnOre: plan.amountOre, newOrder }, 201);
}
