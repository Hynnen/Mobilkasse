'use client';

import { useEffect, useRef } from 'react';
import { formatKr } from '@/lib/money';
import { useScrollLock } from '@/lib/use-scroll-lock';

type Props = { amountOre: number; onConfirm: () => void; onClose: () => void };

/** Spør om Vippsen har kommet før salget registreres: appen tar ikke betalt selv, og Vipps kan feile hos kunden. */
export function PaymentSheet({ amountOre, onConfirm, onClose }: Props) {
  const cancel = useRef<HTMLButtonElement>(null);
  useScrollLock();

  useEffect(() => {
    cancel.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center md:items-center">
      <div className="fade-in absolute inset-0 bg-ink/35" onClick={onClose} aria-hidden />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="payment-title"
        aria-describedby="payment-body"
        className="sheet-up relative w-full max-w-md rounded-t-[28px] bg-ground px-5 pb-[max(env(safe-area-inset-bottom),20px)] pt-6 shadow-float md:rounded-[28px] md:pb-5"
      >
        <h2 id="payment-title" className="text-xl font-extrabold">Har kunden betalt på Vipps?</h2>
        <p className="tabular mt-2 text-[44px] font-extrabold leading-none tracking-[-0.02em]">{formatKr(amountOre)}</p>
        <p id="payment-body" className="mt-3 text-[15px] leading-snug text-ink-2">
          Se etter at betalingen har kommet inn før du registrerer salget. Får ikke kunden betalt, står kurven som den er.
        </p>
        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onConfirm}
            className="press h-14 rounded-full bg-action text-[17px] font-extrabold text-action-ink shadow-card"
          >
            Ja, registrer salget
          </button>
          <button ref={cancel} type="button" onClick={onClose} className="press h-14 rounded-full text-[17px] font-bold text-ink-2">
            Nei, ikke ennå
          </button>
        </div>
      </div>
    </div>
  );
}
