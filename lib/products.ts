import type { PosItem } from './catalog';

/** Ett kort i kassen: et enkelt produkt, eller et variabelt produkt med sine varianter. */
export type ProductGroup = {
  productId: number;
  name: string;
  image: string | null;
  items: PosItem[];
  hasVariants: boolean;
  minPriceOre: number;
  priceVaries: boolean;
  /** Sum av lager over salgbare varianter, eller null hvis noen ikke er lagerstyrt. */
  stock: number | null;
  inStock: boolean;
  backorder: boolean;
};

export function groupByProduct(items: PosItem[]): ProductGroup[] {
  const groups = new Map<number, PosItem[]>();
  for (const item of items) {
    const list = groups.get(item.productId);
    if (list) list.push(item);
    else groups.set(item.productId, [item]);
  }

  return [...groups.values()].map((list) => {
    const first = list[0];
    const prices = list.map((i) => i.priceOre);
    const sellable = list.filter((i) => i.inStock);
    const unmanaged = sellable.some((i) => i.stock === null);
    return {
      productId: first.productId,
      name: first.name,
      image: list.find((i) => i.image)?.image ?? null,
      items: list,
      hasVariants: first.variationId !== 0,
      minPriceOre: Math.min(...prices),
      priceVaries: new Set(prices).size > 1,
      stock: unmanaged ? null : sellable.reduce((sum, i) => sum + (i.stock ?? 0), 0),
      inStock: sellable.length > 0,
      backorder: sellable.some((i) => i.backorder),
    };
  });
}

/** «3 igjen», «Utsolgt», «Restordre» – tekst for lagerstatus. */
export function stockLabel(s: { stock: number | null; inStock: boolean; backorder: boolean }): string {
  if (!s.inStock) return 'Utsolgt';
  if (s.backorder && (s.stock ?? 0) <= 0) return 'Restordre';
  if (s.stock === null) return 'På lager';
  return `${s.stock} igjen`;
}
