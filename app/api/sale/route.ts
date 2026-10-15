import { z } from 'zod';
import { refreshCatalogInBackground } from '@/lib/catalog';
import { mergeLines, outcomeUnknown, saleLinesSchema, verifyCart, type CartRejection } from '@/lib/checkout';
import { toOre } from '@/lib/money';
import { createOrder } from '@/lib/woo';

const saleSchema = z.object({
  lines: saleLinesSchema.min(1),
  expectedTotalOre: z.number().int().nonnegative(),
  note: z.string().trim().max(200).optional(),
});

export type SaleRequest = z.infer<typeof saleSchema>;

export type SaleResponse =
  | { ok: true; orderId: number; number: string; totalOre: number }
  | { ok: false; error: 'invalid'; message: string }
  | CartRejection
  | { ok: false; error: 'woo_error' | 'sale_unknown'; message: string };

const json = (body: SaleResponse, status: number) => Response.json(body, { status });

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

  // 1) Ferskt lager og riktig beløp
  const cart = await verifyCart(lines, expectedTotalOre);
  if (!cart.ok) return json(cart.body, cart.status);

  // 2) Opprett ordren. set_paid → WooCommerce trekker lageret selv.
  try {
    const order = await createOrder(
      lines.map((l) => ({ product_id: l.productId, variation_id: l.variationId, quantity: l.quantity })),
      note,
    );

    refreshCatalogInBackground(); // kassen trekker solgt antall lokalt i mellomtiden
    const wooTotalOre = toOre(order.total);
    if (wooTotalOre !== cart.totalOre) {
      console.warn(`[api/sale] Ordre ${order.number}: WooCommerce-total ${order.total} avviker fra kassens ${cart.totalOre} øre`);
    }

    return json({ ok: true, orderId: order.id, number: order.number, totalOre: wooTotalOre ?? cart.totalOre }, 201);
  } catch (err) {
    console.error('[api/sale] opprett ordre', err);
    return json(
      outcomeUnknown(err)
        ? { ok: false, error: 'sale_unknown', message: 'Usikkert om salget ble registrert. Sjekk ordrene i WooCommerce før du prøver igjen.' }
        : { ok: false, error: 'woo_error', message: 'Nettbutikken avviste salget. Ingen salg er registrert.' },
      502,
    );
  }
}
