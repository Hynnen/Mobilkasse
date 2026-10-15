import { connection } from 'next/server';
import { findSaleByNumber, listRecentSales } from '@/lib/returns';
import type { SaleSummary } from '@/lib/sales';

export type SalesResponse = { ok: true; sales: SaleSummary[] } | { ok: false; error: 'invalid' | 'woo_error'; message: string };

const json = (body: SalesResponse, status = 200) => Response.json(body, { status });

/** «Siste salg»: salg over disk de siste 30 dagene, eller ?q=<ordrenummer>. */
export async function GET(request: Request) {
  await connection();
  const q = new URL(request.url).searchParams.get('q')?.trim().replace(/^#/, '');

  if (q !== undefined && q !== '' && !/^[\w-]{1,30}$/.test(q)) {
    return json({ ok: false, error: 'invalid', message: 'Skriv inn et ordrenummer.' }, 400);
  }

  try {
    if (q) {
      const sale = await findSaleByNumber(q);
      return json({ ok: true, sales: sale ? [sale] : [] });
    }
    return json({ ok: true, sales: await listRecentSales() });
  } catch (err) {
    console.error('[api/orders]', err);
    return json({ ok: false, error: 'woo_error', message: 'Fikk ikke hentet salg fra nettbutikken.' }, 502);
  }
}
