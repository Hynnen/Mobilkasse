'use client';

import { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import { formatKr } from '@/lib/money';

const AUTO_CLOSE_MS = 6000;

type Props = { orderNumber: string; totalOre: number; onDone: () => void };

/** Grønn fullskjerm etter fullført salg. Lukkes med «Neste kunde» eller automatisk. */
export function SaleSuccess({ orderNumber, totalOre, onDone }: Props) {
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    button.current?.focus();
    const timer = setTimeout(onDone, AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="sale-title"
      className="fade-in fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-success px-6 pb-[max(env(safe-area-inset-bottom),24px)] text-center text-white"
    >
      <div className="success-in grid size-28 place-items-center rounded-full bg-white text-success">
        <Check aria-hidden className="size-16" strokeWidth={3} />
      </div>
      <div>
        <h1 id="sale-title" className="text-3xl font-extrabold">Salg registrert</h1>
        <p className="tabular mt-3 text-6xl font-extrabold tracking-[-0.02em]">{formatKr(totalOre)}</p>
        <p className="tabular mt-3 text-lg font-semibold text-white/85">Ordre {orderNumber}</p>
      </div>
      <button
        ref={button}
        type="button"
        onClick={onDone}
        className="press h-16 w-full max-w-sm rounded-full bg-white text-[19px] font-extrabold text-success"
      >
        Neste kunde
      </button>
    </div>
  );
}
