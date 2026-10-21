import type { PosItem } from './catalog';
import { groupByProduct } from './products';

/**
 * Én rad på lagerskjermen: der lagertallet faktisk ligger. Varianter med felles
 * lager på produktet blir én rad (variationId 0), ellers én rad per variant.
 */
export type StockRow = {
  key: string; // `${productId}:${variationId}`, variationId 0 = produktnivå
  productId: number;
  variationId: number;
  /** «Grønn / M», «Alle varianter» eller null for enkle produkter */
  label: string | null;
  /** null = ikke lagerstyrt ennå */
  stock: number | null;
  backorder: boolean;
};

export type StockGroup = { productId: number; name: string; image: string | null; rows: StockRow[] };

/** Endring fra lagerskjermen: legg til/trekk fra (varemottak) eller sett et talt antall. */
export type StockEdit = { mode: 'add'; amount: number } | { mode: 'set'; quantity: number };

export const stockKey = (productId: number, variationId: number) => `${productId}:${variationId}`;

export function toStockGroups(items: PosItem[]): StockGroup[] {
  return groupByProduct(items).map((group) => {
    const rows: StockRow[] = [];
    let shared = false;
    for (const item of group.items) {
      if (item.stockOwner === 'product') {
        // Felles lager: én rad for hele produktet.
        if (shared) continue;
        shared = true;
        rows.push({
          key: stockKey(item.productId, 0),
          productId: item.productId,
          variationId: 0,
          label: group.hasVariants ? 'Alle varianter' : null,
          stock: item.stock,
          backorder: item.backorder,
        });
      } else {
        rows.push({
          key: item.key,
          productId: item.productId,
          variationId: item.variationId,
          label: item.variantLabel,
          stock: item.stock,
          backorder: item.backorder,
        });
      }
    }
    return { productId: group.productId, name: group.name, image: group.image, rows };
  });
}

/** Antallet raden får når endringen lagres (gitt lagertallet vi kjenner nå). */
export function editedStock(stock: number | null, edit: StockEdit): number {
  return edit.mode === 'set' ? edit.quantity : (stock ?? 0) + edit.amount;
}
