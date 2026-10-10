'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { PosItem } from '@/lib/catalog';
import { maxQuantity, type Cart } from '@/lib/cart';
import { formatKr } from '@/lib/money';
import { stockLabel, type ProductGroup } from '@/lib/products';

type Props = {
  group: ProductGroup;
  cart: Cart;
  onPick: (item: PosItem) => void;
  onClose: () => void;
};

/** Variantvelger som ark nedenfra: én stor knapp per variant. Lukkes etter valg. */
export function VariantSheet({ group, cart, onPick, onClose }: Props) {
  const firstButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    firstButton.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const firstSellable = group.items.findIndex((i) => i.inStock);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center md:items-center">
      <div className="fade-in absolute inset-0 bg-ink/35" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="variant-title"
        className="sheet-up relative flex max-h-[85dvh] w-full max-w-lg flex-col rounded-t-[28px] bg-ground pb-[max(env(safe-area-inset-bottom),16px)] shadow-float md:rounded-[28px] md:pb-4"
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-line md:hidden" aria-hidden />
        <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-3">
          <div>
            <h2 id="variant-title" className="text-xl font-extrabold leading-tight">{group.name}</h2>
            <p className="mt-0.5 text-[15px] text-ink-2">Velg variant</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Lukk"
            className="press -mr-1 grid size-12 shrink-0 place-items-center rounded-full bg-card text-ink shadow-card"
          >
            <X className="size-5" strokeWidth={2.5} />
          </button>
        </div>

        <ul className="flex flex-col gap-2 overflow-y-auto px-4 pb-2">
          {group.items.map((item, i) => {
            const inCart = cart[item.key] ?? 0;
            const full = inCart >= maxQuantity(item);
            const disabled = !item.inStock || full;
            return (
              <li key={item.key}>
                <button
                  ref={i === firstSellable ? firstButton : undefined}
                  type="button"
                  disabled={disabled}
                  onClick={() => onPick(item)}
                  className={[
                    'press flex min-h-16 w-full items-center gap-3 rounded-[18px] bg-card px-4 py-3 text-left shadow-card',
                    inCart ? 'ring-2 ring-action' : '',
                    disabled ? 'opacity-50' : '',
                  ].join(' ')}
                >
                  <span className="flex-1">
                    <span className={`block text-[17px] font-bold ${!item.inStock ? 'line-through decoration-2' : ''}`}>
                      {item.variantLabel ?? item.name}
                    </span>
                    <span className="tabular block text-[13px] text-ink-2">
                      {full && item.inStock ? 'Alle i kurven' : stockLabel(item)}
                    </span>
                  </span>
                  {inCart > 0 && (
                    <span className="tabular grid h-8 min-w-8 place-items-center rounded-full bg-action px-2 text-base font-extrabold text-action-ink">
                      {inCart}
                    </span>
                  )}
                  <span className="tabular text-[17px] font-extrabold">{formatKr(item.priceOre)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
