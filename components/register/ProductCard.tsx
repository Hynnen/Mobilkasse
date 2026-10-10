'use client';

import Image from 'next/image';
import { useState } from 'react';
import { ImageOff, Plus } from 'lucide-react';
import { formatKr } from '@/lib/money';
import { stockLabel, type ProductGroup } from '@/lib/products';

type Props = {
  group: ProductGroup;
  inCart: number;
  /** Ingen flere kan legges til (lageret er brukt opp i kurven). */
  atMax: boolean;
  onPress: () => void;
  priority?: boolean;
};

export function ProductCard({ group, inCart, atMax, onPress, priority }: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const soldOut = !group.inStock;
  const price = `${group.priceVaries ? 'fra ' : ''}${formatKr(group.minPriceOre)}`;
  const label = atMax && inCart > 0 ? 'Alle i kurven' : stockLabel(group);
  const low = group.stock !== null && group.stock > 0 && group.stock <= 3;

  return (
    <button
      type="button"
      onClick={onPress}
      disabled={soldOut}
      aria-label={`${group.name}, ${price}, ${label}${inCart ? `, ${inCart} i kurven` : ''}`}
      className={[
        'press group relative flex min-h-48 w-full flex-col overflow-hidden rounded-[20px] bg-card text-left shadow-card',
        'disabled:cursor-not-allowed',
        inCart ? 'ring-2 ring-action' : '',
      ].join(' ')}
    >
      <div className={`relative m-1.5 aspect-[16/11] overflow-hidden rounded-[15px] bg-surface ${soldOut ? 'opacity-45 grayscale' : ''}`}>
        {group.image && !imageFailed ? (
          <Image
            src={group.image}
            alt=""
            fill
            sizes="(min-width: 1280px) 220px, (min-width: 768px) 30vw, 48vw"
            className="object-cover"
            priority={priority}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="grid h-full place-items-center text-ink-2">
            <ImageOff aria-hidden className="size-7" strokeWidth={1.75} />
          </div>
        )}
      </div>

      {inCart > 0 && (
        <span
          key={inCart}
          aria-hidden
          className="pop-in tabular absolute right-3 top-3 grid h-9 min-w-9 place-items-center rounded-full bg-action px-2.5 text-lg font-extrabold text-action-ink shadow-card"
        >
          {inCart}
        </span>
      )}

      <div className={`flex flex-1 flex-col gap-0.5 px-3 pb-2.5 pt-0.5 ${soldOut ? 'opacity-55' : ''}`}>
        <span className="line-clamp-2 text-[15px] font-bold leading-snug">{group.name}</span>
        {group.hasVariants && (
          <span className="text-[13px] text-ink-2">
            {group.items.length} {group.items.length === 1 ? 'variant' : 'varianter'}
          </span>
        )}
        <span className="mt-auto flex items-baseline justify-between gap-2 pt-1">
          <span className="tabular text-[17px] font-extrabold">{price}</span>
          <span
            className={[
              'tabular shrink-0 text-[13px]',
              soldOut ? 'font-bold text-ink' : low ? 'font-bold text-danger' : 'text-ink-2',
            ].join(' ')}
          >
            {label}
          </span>
        </span>
      </div>

      {!soldOut && inCart === 0 && (
        <span aria-hidden className="pointer-events-none absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-card/90 text-ink shadow-card opacity-0 transition-opacity group-hover:opacity-100">
          <Plus className="size-5" strokeWidth={2.5} />
        </span>
      )}
    </button>
  );
}
