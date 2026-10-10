import type { PosItem } from './catalog';

/** Kurven: antall per vare-key. Priser og lager slås alltid opp i ferske varer. */
export type Cart = Record<string, number>;

export type CartAction =
  | { type: 'add'; item: PosItem }
  | { type: 'inc'; item: PosItem }
  | { type: 'dec'; key: string }
  | { type: 'remove'; key: string }
  | { type: 'clear' }
  /** Etter ny produktliste: fjern varer som ikke finnes, og kapp til lager. */
  | { type: 'sync'; items: PosItem[] };

/** Største antall som kan legges i kurven (samme regel som server-sjekken). */
export function maxQuantity(item: Pick<PosItem, 'stock' | 'backorder' | 'inStock'>): number {
  if (!item.inStock) return 0;
  if (item.stock === null || item.backorder) return 99;
  return Math.min(item.stock, 99);
}

function without(cart: Cart, key: string): Cart {
  const next = { ...cart };
  delete next[key];
  return next;
}

export function cartReducer(cart: Cart, action: CartAction): Cart {
  switch (action.type) {
    case 'add':
    case 'inc': {
      const { key } = action.item;
      const next = (cart[key] ?? 0) + 1;
      if (next > maxQuantity(action.item)) return cart;
      return { ...cart, [key]: next };
    }
    case 'dec': {
      const qty = (cart[action.key] ?? 0) - 1;
      return qty > 0 ? { ...cart, [action.key]: qty } : without(cart, action.key);
    }
    case 'remove':
      return without(cart, action.key);
    case 'clear':
      return {};
    case 'sync': {
      const byKey = new Map(action.items.map((i) => [i.key, i]));
      const next: Cart = {};
      for (const [key, qty] of Object.entries(cart)) {
        const item = byKey.get(key);
        const capped = item ? Math.min(qty, maxQuantity(item)) : 0;
        if (capped > 0) next[key] = capped;
      }
      return next;
    }
  }
}

export type CartLine = { item: PosItem; quantity: number };

export function cartLines(cart: Cart, items: PosItem[]): CartLine[] {
  const byKey = new Map(items.map((i) => [i.key, i]));
  return Object.entries(cart).flatMap(([key, quantity]) => {
    const item = byKey.get(key);
    return item ? [{ item, quantity }] : [];
  });
}

export const cartTotalOre = (lines: CartLine[]) => lines.reduce((sum, l) => sum + l.item.priceOre * l.quantity, 0);
export const cartCount = (lines: CartLine[]) => lines.reduce((sum, l) => sum + l.quantity, 0);
