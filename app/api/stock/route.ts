import { z } from 'zod';
import { hasStockAccess } from '@/lib/auth';
import { expireCatalog } from '@/lib/catalog';
import { outcomeUnknown } from '@/lib/checkout';
import { stockKey } from '@/lib/stock';
import { getProduct, getVariation, setProductStock, setVariationStock, WooError } from '@/lib/woo';

const MAX_STOCK = 99_999;

const changeSchema = z
  .object({
    productId: z.number().int().positive(),
    /** 0 = lageret på produktet (enkelt produkt, eller felles for variantene) */
    variationId: z.number().int().nonnegative(),
  })
  .and(
    z.discriminatedUnion('mode', [
      // Varemottak: legges til ferskt tall, så salg i mellomtiden ikke overskrives.
      z.object({ mode: z.literal('add'), amount: z.number().int().min(-MAX_STOCK).max(MAX_STOCK).refine((n) => n !== 0) }),
      // Varetelling: det faktiske antallet på hylla.
      z.object({ mode: z.literal('set'), quantity: z.number().int().min(0).max(MAX_STOCK) }),
    ]),
  );

const stockSchema = z.object({ changes: z.array(changeSchema).min(1).max(100) });

export type StockRequest = z.infer<typeof stockSchema>;

export type StockResult =
  | { key: string; ok: true; stock: number }
  | { key: string; ok: false; message: string; stock?: number | null };

export type StockResponse =
  | { ok: true; results: StockResult[] }
  | { ok: false; error: 'invalid' | 'forbidden'; message: string };

const json = (body: StockResponse, status: number) => Response.json(body, { status });

export async function POST(request: Request) {
  // Kun JSON: et skjema fra et annet nettsted kan ikke sende dette uten CORS-preflight.
  if (!request.headers.get('content-type')?.includes('application/json')) {
    return json({ ok: false, error: 'invalid', message: 'Ugyldig forespørsel.' }, 415);
  }
  if (!(await hasStockAccess())) {
    return json({ ok: false, error: 'forbidden', message: 'Lagerkoden må tastes inn på nytt.' }, 403);
  }

  const parsed = stockSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return json({ ok: false, error: 'invalid', message: 'Ugyldige lagerendringer.' }, 400);
  }

  // Én og én: delt hosting tåler ikke mange skrivekall samtidig, og hver rad skal lykkes eller feile for seg.
  const results: StockResult[] = [];
  for (const change of parsed.data.changes) {
    results.push(await applyChange(change));
  }

  if (results.some((r) => r.ok)) expireCatalog(); // kassen skal se de nye tallene med en gang
  return json({ ok: true, results }, 200);
}

async function applyChange(change: StockRequest['changes'][number]): Promise<StockResult> {
  const { productId, variationId } = change;
  const key = stockKey(productId, variationId);

  // Ferskt tall fra butikken, ikke det kassen viste.
  let current: number | null;
  try {
    const target = variationId > 0 ? await getVariation(productId, variationId) : await getProduct(productId);
    current = target.manage_stock === true ? (target.stock_quantity ?? 0) : null;
  } catch (err) {
    console.error('[api/stock] hent', key, err);
    const message = err instanceof WooError && err.status === 404 ? 'Finnes ikke lenger i nettbutikken.' : 'Fikk ikke kontakt med nettbutikken.';
    return { key, ok: false, message };
  }

  const next = change.mode === 'set' ? change.quantity : (current ?? 0) + change.amount;
  if (next < 0 && change.mode === 'add') {
    return { key, ok: false, message: `Bare ${current ?? 0} på lager nå, kan ikke trekke fra ${-change.amount}.`, stock: current };
  }
  if (next > MAX_STOCK) return { key, ok: false, message: 'For stort antall.', stock: current };

  try {
    const updated = variationId > 0 ? await setVariationStock(productId, variationId, next) : await setProductStock(productId, next);
    return { key, ok: true, stock: updated.stock_quantity ?? next };
  } catch (err) {
    console.error('[api/stock] lagre', key, err);
    return {
      key,
      ok: false,
      message: outcomeUnknown(err)
        ? 'Usikkert om endringen ble lagret. Trykk Oppdater og sjekk tallet før du prøver igjen.'
        : 'Nettbutikken avviste endringen.',
      stock: current,
    };
  }
}
