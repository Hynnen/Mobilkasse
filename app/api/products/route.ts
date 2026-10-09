import { connection } from 'next/server';
import { getPosItems } from '@/lib/catalog';
import { WooError } from '@/lib/woo';

export async function GET() {
  await connection(); // alltid ferske lagertall

  try {
    const items = await getPosItems();
    return Response.json({ items, fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[api/products]', err);
    const message = err instanceof WooError ? 'Fikk ikke hentet produkter fra nettbutikken.' : 'Kunne ikke laste produkter.';
    return Response.json({ error: 'products_unavailable', message }, { status: 502 });
  }
}
