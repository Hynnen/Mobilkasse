import { z } from 'zod';
import { checkStock, itemKey, type SaleLine, type StockProblem } from '@/lib/catalog';
import { toOre } from '@/lib/money';
import { createOrder, WooError } from '@/lib/woo';

const saleSchema = z.object({
  lines: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        variationId: z.number().int().nonnegative(),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1)
    .max(50),
  expectedTotalOre: z.number().int().nonnegative(),
  note: z.string().trim().max(200).optional(),
});

export type SaleRequest = z.infer<typeof saleSchema>;

export type SaleResponse =
  | { ok: true; orderId: number; number: string; totalOre: number }
  | { ok: false; error: 'invalid'; message: string }
  | { ok: false; error: 'insufficient_stock'; message: string; problems: StockProblem[] }
  | { ok: false; error: 'price_changed'; message: string; totalOre: number }
  | { ok: false; error: 'woo_error' | 'sale_unknown'; message: string };

const json = (body: SaleResponse, status: number) => Response.json(body, { status });

/** Slår sammen linjer for samme vare, så lagersjekken ser riktig antall. */
function mergeLines(lines: SaleLine[]): SaleLine[] {
  const merged = new Map<string, SaleLine>();
  for (const l of lines) {
    const key = itemKey(l.productId, l.variationId);
    const existing = merged.get(key);
    if (existing) existing.quantity += l.quantity;
    else merged.set(key, { ...l });
  }
  return [...merged.values()];
}

export async function POST(request: Request) {
  // Kun JSON: et skjema fra et annet nettsted kan ikke sende dette uten CORS-preflight.
  if (!request.headers.get('content-type')?.includes('application/json')) {
    return json({ ok: false, error: 'invalid', message: 'Ugyldig forespørsel.' }, 415);
  }

  const parsed = saleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return json({ ok: false, error: 'invalid', message: 'Ugyldig kurv.' }, 400);
  }
  const { expectedTotalOre, note } = parsed.data;
  const lines = mergeLines(parsed.data.lines);

  // 1) Ferske lagertall. REST API-et stopper ikke salg ved for lite lager, så det må gjøres her.
  let stock;
  try {
    stock = await checkStock(lines);
  } catch (err) {
    console.error('[api/sale] lagersjekk', err);
    return json({ ok: false, error: 'woo_error', message: 'Fikk ikke kontakt med nettbutikken. Ingen salg er registrert.' }, 502);
  }

  if (!stock.ok) {
    return json(
      { ok: false, error: 'insufficient_stock', message: 'For lite på lager.', problems: stock.problems },
      409,
    );
  }

  // 2) Selgeren må ha vist kunden riktig beløp.
  if (stock.totalOre !== expectedTotalOre) {
    return json(
      { ok: false, error: 'price_changed', message: 'Prisen er endret. Sjekk beløpet med kunden.', totalOre: stock.totalOre },
      409,
    );
  }

  // 3) Opprett ordren. set_paid → WooCommerce trekker lageret selv.
  try {
    const order = await createOrder(
      lines.map((l) => ({ product_id: l.productId, variation_id: l.variationId, quantity: l.quantity })),
      note,
    );

    const wooTotalOre = toOre(order.total);
    if (wooTotalOre !== stock.totalOre) {
      console.warn(`[api/sale] Ordre ${order.number}: WooCommerce-total ${order.total} avviker fra kassens ${stock.totalOre} øre`);
    }

    return json({ ok: true, orderId: order.id, number: order.number, totalOre: wooTotalOre ?? stock.totalOre }, 201);
  } catch (err) {
    console.error('[api/sale] opprett ordre', err);
    // Ved tidsavbrudd/nettverksfeil vet vi ikke om ordren ble opprettet.
    const unknown = err instanceof WooError && (err.code === 'timeout' || err.code === 'network_error');
    return json(
      unknown
        ? { ok: false, error: 'sale_unknown', message: 'Usikkert om salget ble registrert. Sjekk ordrene i WooCommerce før du prøver igjen.' }
        : { ok: false, error: 'woo_error', message: 'Nettbutikken avviste salget. Ingen salg er registrert.' },
      502,
    );
  }
}
