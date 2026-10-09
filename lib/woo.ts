import 'server-only';
import { getConfig, type AuthMode } from './config';

// ---------- Typer (kun feltene vi bruker) ----------

export type StockStatus = 'instock' | 'outofstock' | 'onbackorder';

export type Backorders = 'no' | 'notify' | 'yes';

export type WooImage = { id: number; src: string; alt: string };

export type WooTerm = { id: number; name: string; slug: string };

export type WooProduct = {
  id: number;
  name: string;
  slug: string;
  type: 'simple' | 'variable' | 'grouped' | 'external' | string;
  status: string;
  price: string;
  regular_price: string;
  sale_price: string;
  purchasable: boolean;
  virtual: boolean;
  downloadable: boolean;
  manage_stock: boolean;
  stock_quantity: number | null;
  stock_status: StockStatus;
  backorders: Backorders;
  menu_order: number;
  images: WooImage[];
  categories: WooTerm[];
  tags: WooTerm[];
  variations: number[];
};

export type WooVariation = {
  id: number;
  status: string;
  price: string;
  regular_price: string;
  sale_price: string;
  purchasable: boolean;
  /** 'parent' = lageret styres på foreldreproduktet */
  manage_stock: boolean | 'parent';
  stock_quantity: number | null;
  stock_status: StockStatus;
  backorders: Backorders;
  menu_order: number;
  image: WooImage | null;
  attributes: { id: number; name: string; option: string }[];
};

export type WooOrderStatus =
  | 'pending'
  | 'processing'
  | 'on-hold'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'failed';

export type WooOrder = {
  id: number;
  number: string;
  status: WooOrderStatus;
  total: string;
  date_created: string;
  customer_note: string;
  line_items: { id: number; name: string; product_id: number; variation_id: number; quantity: number; total: string }[];
};

export type OrderLine = { product_id: number; variation_id: number; quantity: number };

export type CreateOrderInput = {
  status: 'completed';
  set_paid: true;
  payment_method: string;
  payment_method_title: string;
  line_items: OrderLine[];
  meta_data: { key: string; value: string }[];
  customer_note?: string;
};

export const ORDER_CHANNEL_META_KEY = '_mobilkasse_kanal';
export const ORDER_CHANNEL_VALUE = 'over-disk';

// ---------- Feil ----------

export class WooError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'WooError';
  }
}

// ---------- Lavnivå-klient ----------

type Query = Record<string, string | number | boolean | undefined>;
type FetchOptions = { method?: 'GET' | 'POST' | 'PUT'; query?: Query; body?: unknown };

const TIMEOUT_MS = 15_000;

// Huskes per serverinstans: i auto-modus byttes det til query hvis hosten stripper Basic auth.
let resolvedAuthMode: Exclude<AuthMode, 'auto'> | undefined;

export function getAuthModeInUse(): Exclude<AuthMode, 'auto'> {
  const { authMode } = getConfig().woo;
  return authMode === 'auto' ? (resolvedAuthMode ?? 'header') : authMode;
}

async function request(
  path: string,
  { method = 'GET', query, body }: FetchOptions,
  mode: Exclude<AuthMode, 'auto'>,
): Promise<Response> {
  const { url, consumerKey, consumerSecret } = getConfig().woo;
  const target = new URL(`${url}/wp-json/wc/v3${path}`);
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined) target.searchParams.set(k, String(v));
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (mode === 'header') {
    headers.Authorization = `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')}`;
  } else {
    target.searchParams.set('consumer_key', consumerKey);
    target.searchParams.set('consumer_secret', consumerSecret);
  }

  try {
    return await fetch(target, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    // Logg aldri URL med query (kan inneholde nøkler).
    const timedOut = err instanceof Error && err.name === 'TimeoutError';
    throw new WooError(
      timedOut ? `Tidsavbrudd mot WooCommerce (${method} ${path})` : `Nettverksfeil mot WooCommerce (${method} ${path})`,
      0,
      timedOut ? 'timeout' : 'network_error',
    );
  }
}

async function toWooError(res: Response, method: string, path: string): Promise<WooError> {
  let code: string | undefined;
  let message = `WooCommerce svarte ${res.status} (${method} ${path})`;
  try {
    const json = (await res.json()) as { code?: string; message?: string };
    code = json.code;
    if (json.message) message = `${json.message} (${method} ${path})`;
  } catch {
    // Ikke JSON (f.eks. HTML-feilside fra hosten)
  }
  return new WooError(message, res.status, code);
}

export async function wooFetch<T>(path: string, opts: FetchOptions = {}): Promise<{ data: T; headers: Headers }> {
  const configured = getConfig().woo.authMode;
  const mode = getAuthModeInUse();

  let res = await request(path, opts, mode);

  // 401 i auto-modus med header: prøv query én gang (trygt også for POST, 401 betyr at ingenting ble utført).
  if (res.status === 401 && configured === 'auto' && mode === 'header') {
    const retry = await request(path, opts, 'query');
    if (retry.ok) resolvedAuthMode = 'query';
    res = retry;
  } else if (res.ok && configured === 'auto' && !resolvedAuthMode) {
    resolvedAuthMode = mode;
  }

  if (!res.ok) throw await toWooError(res, opts.method ?? 'GET', path);
  return { data: (await res.json()) as T, headers: res.headers };
}

/** Henter alle sider (per_page=100) basert på X-WP-TotalPages. */
export async function wooFetchAll<T>(path: string, query: Query = {}): Promise<T[]> {
  const first = await wooFetch<T[]>(path, { query: { ...query, per_page: 100, page: 1 } });
  const totalPages = Number(first.headers.get('X-WP-TotalPages') ?? '1');
  if (totalPages <= 1) return first.data;

  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) =>
      wooFetch<T[]>(path, { query: { ...query, per_page: 100, page: i + 2 } }).then((r) => r.data),
    ),
  );
  return [first.data, ...rest].flat();
}

// ---------- Produkter ----------

export type ListProductsParams = { category?: number; tag?: number };

export function listProducts(params: ListProductsParams = {}): Promise<WooProduct[]> {
  return wooFetchAll<WooProduct>('/products', { status: 'publish', ...params });
}

export async function getProduct(id: number): Promise<WooProduct> {
  return (await wooFetch<WooProduct>(`/products/${id}`)).data;
}

export function listVariations(productId: number): Promise<WooVariation[]> {
  return wooFetchAll<WooVariation>(`/products/${productId}/variations`);
}

export async function getVariation(productId: number, variationId: number): Promise<WooVariation> {
  return (await wooFetch<WooVariation>(`/products/${productId}/variations/${variationId}`)).data;
}

export type TermRef = { kind: 'category' | 'tag'; id: number };

const termCache = new Map<string, TermRef | null>();

/** Slår opp slug som produktkategori først, deretter som tagg. */
export async function findTermIdBySlug(slug: string): Promise<TermRef | null> {
  if (termCache.has(slug)) return termCache.get(slug)!;

  let ref: TermRef | null = null;
  const cats = (await wooFetch<WooTerm[]>('/products/categories', { query: { slug } })).data;
  if (cats[0]) {
    ref = { kind: 'category', id: cats[0].id };
  } else {
    const tags = (await wooFetch<WooTerm[]>('/products/tags', { query: { slug } })).data;
    if (tags[0]) ref = { kind: 'tag', id: tags[0].id };
  }

  termCache.set(slug, ref);
  return ref;
}

// ---------- Ordre ----------

/**
 * Oppretter en fullført, betalt ordre. `set_paid: true` gjør at WooCommerce
 * trekker lageret selv, så lager skal IKKE trekkes manuelt i tillegg.
 */
export async function createOrder(lines: OrderLine[], note?: string): Promise<WooOrder> {
  const body: CreateOrderInput = {
    status: 'completed',
    set_paid: true,
    payment_method: 'vipps_over_disk',
    payment_method_title: 'Vipps over disk',
    line_items: lines,
    meta_data: [{ key: ORDER_CHANNEL_META_KEY, value: ORDER_CHANNEL_VALUE }],
    ...(note ? { customer_note: note } : {}),
  };
  return (await wooFetch<WooOrder>('/orders', { method: 'POST', body })).data;
}

/** Brukes i fase 2 (angre salg → cancelled gjenoppretter lager). */
export async function updateOrderStatus(id: number, status: WooOrderStatus): Promise<WooOrder> {
  return (await wooFetch<WooOrder>(`/orders/${id}`, { method: 'PUT', body: { status } })).data;
}
