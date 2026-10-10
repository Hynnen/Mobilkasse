import { connection } from 'next/server';
import { getPosItems, getPosItemsFresh } from '@/lib/catalog';
import { WooError } from '@/lib/woo';

export async function GET(request: Request) {
  await connection();
  // ?fresh=1 («Oppdater»-knappen, etter prisendring): hent direkte fra butikken.
  const fresh = new URL(request.url).searchParams.has('fresh');

  try {
    const items = await (fresh ? getPosItemsFresh() : getPosItems());
    return Response.json({ items, fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[api/products]', err);
    const message = err instanceof WooError ? 'Fikk ikke hentet produkter fra nettbutikken.' : 'Kunne ikke laste produkter.';
    return Response.json({ error: 'products_unavailable', message }, { status: 502 });
  }
}
