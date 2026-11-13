import 'server-only';
import { cacheLife, cacheTag, revalidateTag } from 'next/cache';
import { getConfig } from './config';
import { toOre } from './money';
import {
  findTermIdBySlug,
  getProduct,
  getVariation,
  listProducts,
  listVariations,
  orNullOn404,
  type WooProduct,
  type WooVariation,
} from './woo';

// ---------- Typer ----------

/** Én salgbar vare i kassen: et enkelt produkt eller én variant. */
export type PosItem = {
  key: string; // `${productId}:${variationId}`
  productId: number;
  variationId: number; // 0 for enkle produkter
  name: string;
  variantLabel: string | null; // «Grønn / M»
  description: string | null; // variantbeskrivelsen fra WooCommerce, som ren tekst
  priceOre: number;
  stock: number | null; // null = ikke lagerstyrt
  inStock: boolean;
  backorder: boolean; // restordre tillatt: kan selges selv om lageret er tomt
  /** Hvor lagertallet ligger: på varianten, på produktet (delt av variantene) eller ingen steder. */
  stockOwner: StockOwner;
  image: string | null;
};

export type StockOwner = 'variation' | 'product' | null;

export type SaleLine = { productId: number; variationId: number; quantity: number };

export type StockProblem = {
  key: string;
  name: string;
  requested: number;
  available: number;
  reason: 'insufficient' | 'unavailable';
};

export type StockCheck =
  | { ok: true; items: (PosItem & { quantity: number })[]; totalOre: number }
  | { ok: false; problems: StockProblem[] };

export const itemKey = (productId: number, variationId: number) => `${productId}:${variationId}`;

export const displayName = (item: Pick<PosItem, 'name' | 'variantLabel'>) =>
  item.variantLabel ? `${item.name} (${item.variantLabel})` : item.name;

// ---------- Lager ----------

type ResolvedStock = {
  stock: number | null;
  inStock: boolean;
  backorder: boolean;
  /** Hvilket objekt som eier lageret. Varianter med `manage_stock: 'parent'` deler foreldrens beholdning. */
  poolId: number | null;
  owner: StockOwner;
};

/**
 * Lager kan styres på produkt- eller variantnivå. En variant med
 * `manage_stock: 'parent'` (eller false mens forelderen styrer lager) bruker foreldrens tall.
 */
export function resolveStock(product: WooProduct, variation?: WooVariation): ResolvedStock {
  let source: WooProduct | WooVariation | null = null;
  if (variation?.manage_stock === true) source = variation;
  else if (product.manage_stock) source = product;

  if (source) {
    const stock = source.stock_quantity ?? 0;
    const backorder = source.backorders !== 'no';
    const owner = source === product ? 'product' : 'variation';
    return { stock, backorder, inStock: stock > 0 || backorder, poolId: source.id, owner };
  }

  const status = (variation ?? product).stock_status;
  return { stock: null, backorder: status === 'onbackorder', inStock: status !== 'outofstock', poolId: null, owner: null };
}

/** Største antall som kan selges, eller Infinity hvis lageret ikke begrenser. */
export function maxQuantity(item: Pick<PosItem, 'stock' | 'backorder' | 'inStock'>): number {
  if (!item.inStock) return 0;
  if (item.stock === null || item.backorder) return Infinity;
  return item.stock;
}

// ---------- Normalisering ----------

const SUPPORTED_TYPES = new Set(['simple', 'variable']);

// Nedlastbare varer skjules: kasseordre har ingen kunde-e-post, så kunden ville ikke fått nedlastingslenken.
function isSellableProduct(p: WooProduct): boolean {
  return p.status === 'publish' && p.purchasable && !p.downloadable && SUPPORTED_TYPES.has(p.type);
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/** WooCommerce lagrer beskrivelser som HTML. Kassen viser dem som ren tekst på én linje. */
function toPlainText(html: string | undefined): string | null {
  if (!html) return null;
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
      if (e[0] === '#') {
        const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : m;
      }
      return ENTITIES[e.toLowerCase()] ?? m;
    })
    .replace(/\s+/g, ' ')
    .trim();
  return text || null;
}

function toPosItem(product: WooProduct, variation?: WooVariation): PosItem | null {
  if (!isSellableProduct(product)) return null;
  if (product.type === 'variable' && !variation) return null;

  if (variation && (variation.status !== 'publish' || !variation.purchasable || variation.downloadable)) return null;
  const priceOre = toOre((variation ?? product).price);
  if (priceOre === null) return null;

  const { stock, inStock, backorder, owner } = resolveStock(product, variation);
  const variationId = variation?.id ?? 0;

  return {
    key: itemKey(product.id, variationId),
    productId: product.id,
    variationId,
    name: product.name,
    variantLabel: variation ? variation.attributes.map((a) => a.option).join(' / ') || null : null,
    description: variation ? toPlainText(variation.description) : null,
    priceOre,
    stock,
    inStock,
    backorder,
    stockOwner: owner,
    image: variation?.image?.src ?? product.images[0]?.src ?? null,
  };
}

/** Kjører `fn` over `items` med maks `limit` samtidige kall (skåner delt hosting). */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

// ---------- Katalog ----------

const CATALOG_TAG = 'pos-catalog';

/**
 * Varelisten ligger i Next sin delte cache («use cache: remote»), felles for alle
 * serverinstanser. Fersk i 30 s; deretter vises lagret liste mens en ny hentes i
 * bakgrunnen. Etter en time uten bruk venter neste åpning på fersk liste.
 * Trygt fordi checkStock() alltid henter ferske tall før salg.
 */
export async function getPosItems(): Promise<PosItem[]> {
  'use cache: remote';
  cacheTag(CATALOG_TAG);
  cacheLife({ stale: 30, revalidate: 30, expire: 3600 });
  return loadPosItems();
}

/** Etter salg: hent ny liste i bakgrunnen, men vis lagret liste så lenge. */
export function refreshCatalogInBackground(): void {
  revalidateTag(CATALOG_TAG, 'max');
}

/** Når lagret liste ikke kan brukes (prisendring): neste kall venter på fersk liste. */
export function expireCatalog(): void {
  revalidateTag(CATALOG_TAG, { expire: 0 });
}

/**
 * Fersk liste rett fra butikken, utenom cachen («Oppdater»-knappen).
 * Ikke kombiner med expireCatalog() i samme forespørsel: da regnes også den nye
 * cacheoppføringen som utgått, og neste kall henter alt på nytt.
 */
export function getPosItemsFresh(): Promise<PosItem[]> {
  return loadPosItems();
}

/**
 * Alle salgbare varer for kassen, inkl. varianter. Utsolgte varer tas med
 * (de vises grået ut). Rekkefølge: produktenes menu_order, ellers butikkens standard.
 */
async function loadPosItems(): Promise<PosItem[]> {
  const { posCategory } = getConfig().woo;

  let filter = {};
  if (posCategory) {
    const term = await findTermIdBySlug(posCategory);
    if (!term) throw new Error(`Fant verken kategori eller tagg med slug «${posCategory}» (WOO_POS_CATEGORY)`);
    filter = { [term.kind]: term.id };
  }

  const products = (await listProducts(filter))
    .filter(isSellableProduct)
    .sort((a, b) => a.menu_order - b.menu_order);

  const perProduct = await mapLimit(products, 2, async (product) => {
    if (product.type !== 'variable') return [toPosItem(product)];
    const variations = (await listVariations(product.id)).sort((a, b) => a.menu_order - b.menu_order);
    return variations.map((v) => toPosItem(product, v));
  });

  return perProduct.flat().filter((item): item is PosItem => item !== null);
}

// ---------- Lagersjekk før salg ----------

/**
 * Henter ferske produkt- og variantdata for kurven og sjekker lager.
 * REST API-et validerer ikke lager ved ordreopprettelse, så dette må gjøres her.
 * Linjer med samme key må være slått sammen på forhånd.
 */
export async function checkStock(lines: SaleLine[]): Promise<StockCheck> {
  const productIds = [...new Set(lines.map((l) => l.productId))];
  const products = new Map(
    await Promise.all(productIds.map(async (id) => [id, await orNullOn404(getProduct(id))] as const)),
  );
  const variations = new Map(
    await Promise.all(
      lines
        .filter((l) => l.variationId > 0)
        .map(async (l) => [l.variationId, await orNullOn404(getVariation(l.productId, l.variationId))] as const),
    ),
  );

  const problems: StockProblem[] = [];
  const items: (PosItem & { quantity: number })[] = [];
  // Varianter som deler foreldrens lager må sjekkes mot summen av det som bestilles.
  const pools = new Map<number, { requested: number; available: number; lines: { item: PosItem; quantity: number }[] }>();

  for (const line of lines) {
    const key = itemKey(line.productId, line.variationId);
    const product = products.get(line.productId) ?? null;
    const variation = line.variationId > 0 ? (variations.get(line.variationId) ?? null) : undefined;
    const item = product && variation !== null ? toPosItem(product, variation) : null;

    if (!item || !item.inStock) {
      problems.push({
        key,
        name: item ? displayName(item) : (product?.name ?? 'Ukjent vare'),
        requested: line.quantity,
        available: 0,
        reason: item ? 'insufficient' : 'unavailable',
      });
      continue;
    }

    items.push({ ...item, quantity: line.quantity });

    const { poolId } = resolveStock(product!, variation ?? undefined);
    const max = maxQuantity(item);
    if (poolId !== null && Number.isFinite(max)) {
      const pool = pools.get(poolId) ?? { requested: 0, available: max, lines: [] };
      pool.requested += line.quantity;
      pool.lines.push({ item, quantity: line.quantity });
      pools.set(poolId, pool);
    }
  }

  for (const pool of pools.values()) {
    if (pool.requested <= pool.available) continue;
    for (const { item, quantity } of pool.lines) {
      problems.push({
        key: item.key,
        name: displayName(item),
        requested: quantity,
        available: pool.available,
        reason: 'insufficient',
      });
    }
  }

  if (problems.length > 0) return { ok: false, problems };
  return { ok: true, items, totalOre: items.reduce((sum, i) => sum + i.priceOre * i.quantity, 0) };
}
