import { connection } from 'next/server';
import { ConfigError, getConfig } from '@/lib/config';
import { findTermIdBySlug, getAuthModeInUse, wooFetch, WooError, type WooProduct } from '@/lib/woo';

function hintFor(err: WooError): string {
  if (err.code === 'timeout' || err.code === 'network_error') return 'Får ikke kontakt med butikken. Sjekk WOO_URL og nettet.';
  if (err.status === 401)
    return 'Feil nøkkel, nøkkelen mangler Les/Skriv, eller hosten stripper Basic auth (prøv WOO_AUTH_MODE=query).';
  if (err.status === 403) return 'Nøkkelen mangler tilgang. Sjekk at den har Les/Skriv og at brukeren har riktig rolle.';
  if (err.status === 404) return 'Fant ikke REST API. Sjekk WOO_URL, og at permalenker ikke står på «Enkel».';
  return 'Uventet svar fra WooCommerce.';
}

export async function GET() {
  await connection(); // alltid ved forespørsel, aldri forhåndsrendret

  let config;
  try {
    config = getConfig();
  } catch (err) {
    if (err instanceof ConfigError) {
      return Response.json({ ok: false, step: 'config', issues: err.issues }, { status: 500 });
    }
    throw err;
  }

  const started = Date.now();
  try {
    const { data, headers } = await wooFetch<WooProduct[]>('/products', {
      query: { per_page: 1, status: 'publish' },
    });
    const posCategory = config.woo.posCategory ? await findTermIdBySlug(config.woo.posCategory) : null;
    const p = data[0];

    return Response.json({
      ok: true,
      store: config.store.name,
      wooHost: new URL(config.woo.url).host,
      authMode: getAuthModeInUse(),
      latencyMs: Date.now() - started,
      productTotal: Number(headers.get('X-WP-Total') ?? data.length),
      posCategory: config.woo.posCategory
        ? { slug: config.woo.posCategory, resolved: posCategory, warning: posCategory ? undefined : 'Fant verken kategori eller tagg med denne slugen' }
        : null,
      sample: p
        ? {
            id: p.id,
            name: p.name,
            type: p.type,
            price: p.price,
            manage_stock: p.manage_stock,
            stock_quantity: p.stock_quantity,
            stock_status: p.stock_status,
          }
        : null,
    });
  } catch (err) {
    if (err instanceof WooError) {
      return Response.json(
        { ok: false, step: 'woo', status: err.status, code: err.code, message: err.message, hint: hintFor(err) },
        { status: 502 },
      );
    }
    throw err;
  }
}
