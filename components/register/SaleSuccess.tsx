'use client';

import { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import { formatKr } from '@/lib/money';

const AUTO_CLOSE_MS = 6000;

type Props = {
  title: string;
  /** Tekst over beløpet, f.eks. «Gi tilbake på Vipps» */
  lead?: string;
  amountOre: number | null;
  caption: string;
  /** Av når selgeren må gjøre noe etterpå (betale tilbake på Vipps): skjermen står til den lukkes. */
  autoClose?: boolean;
  doneLabel?: string;
  onDone: () => void;
};

/** Grønn fullskjerm etter fullført salg, retur eller bytte. */
export function SaleSuccess({ title, lead, amountOre, caption, autoClose = true, doneLabel = 'Neste kunde', onDone }: Props) {
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    button.current?.focus();
    if (!autoClose) return;
    const timer = setTimeout(onDone, AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [onDone, autoClose]);

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
        <h1 id="sale-title" className="text-3xl font-extrabold">{title}</h1>
        {lead && <p className="mt-5 text-xl font-extrabold">{lead}</p>}
        {amountOre !== null && (
          <p className={`tabular text-6xl font-extrabold tracking-[-0.02em] ${lead ? 'mt-1' : 'mt-3'}`}>{formatKr(amountOre)}</p>
        )}
        <p className="tabular mt-3 text-lg font-semibold text-white/85">{caption}</p>
      </div>
      <button
        ref={button}
        type="button"
        onClick={onDone}
        className="press h-16 w-full max-w-sm rounded-full bg-white text-[19px] font-extrabold text-success"
      >
        {doneLabel}
      </button>
    </div>
  );
}
