import { connection } from 'next/server';
import { loadSale } from '@/lib/returns';
import type { SaleDetail } from '@/lib/sales';

export type SaleDetailResponse =
  | { ok: true; sale: SaleDetail }
  | { ok: false; error: 'not_found' | 'woo_error'; message: string };

const json = (body: SaleDetailResponse, status = 200) => Response.json(body, { status });

/** Ett salg med hva som fortsatt kan returneres (alltid ferske tall). */
export async function GET(_request: Request, ctx: RouteContext<'/api/orders/[id]'>) {
  await connection();
  const id = Number((await ctx.params).id);
  const notFound = () => json({ ok: false, error: 'not_found', message: 'Fant ikke salget.' }, 404);
  if (!Number.isSafeInteger(id) || id <= 0) return notFound();

  try {
    const loaded = await loadSale(id);
    return loaded ? json({ ok: true, sale: loaded.detail }) : notFound();
  } catch (err) {
    console.error('[api/orders/[id]]', err);
    return json({ ok: false, error: 'woo_error', message: 'Fikk ikke hentet salget fra nettbutikken.' }, 502);
  }
}
