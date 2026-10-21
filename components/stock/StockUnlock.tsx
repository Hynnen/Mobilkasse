'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { ArrowLeft, LoaderCircle } from 'lucide-react';
import { unlockStock, type UnlockState } from '@/app/lager/actions';

/** Egen kode for lager, så bare de som har ansvar for varene kan endre antall. */
export function StockUnlock({ numeric }: { numeric: boolean }) {
  const [state, action, pending] = useActionState<UnlockState, FormData>(unlockStock, {});

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col">
      <header className="flex h-16 items-center px-2">
        <Link href="/" className="press flex h-12 items-center gap-1.5 rounded-full px-3 text-[17px] font-bold text-ink-2">
          <ArrowLeft aria-hidden className="size-5" strokeWidth={2.5} />
          Kasse
        </Link>
      </header>
      <main className="flex flex-1 flex-col justify-center gap-10 px-6 pb-[20dvh]">
        <div className="text-center">
          <h1 className="text-[28px] font-extrabold leading-tight">Lager</h1>
          <p className="mt-1 text-[17px] text-ink-2">Tast lagerkoden for å endre antall</p>
        </div>
        <form action={action} className="flex w-full flex-col gap-3">
          <label htmlFor="stock-pin" className="text-[15px] font-bold text-ink-2">
            {numeric ? 'PIN-kode for lager' : 'Kode for lager'}
          </label>
          <input
            id="stock-pin"
            name="pin"
            type="password"
            inputMode={numeric ? 'numeric' : 'text'}
            pattern={numeric ? '\\d*' : undefined}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={64}
            autoFocus
            required
            aria-invalid={Boolean(state.error)}
            aria-describedby={state.error ? 'stock-pin-error' : undefined}
            className={`tabular h-16 rounded-[20px] bg-card px-4 text-center shadow-card outline-none ring-action focus:ring-2 aria-invalid:ring-2 aria-invalid:ring-danger ${numeric ? 'text-3xl tracking-[0.5em]' : 'text-2xl tracking-[0.15em]'}`}
          />
          <p id="stock-pin-error" role="alert" className="min-h-6 text-center text-[15px] font-bold text-danger">
            {state.error}
          </p>
          <button
            type="submit"
            disabled={pending}
            className="press flex h-16 items-center justify-center gap-2 rounded-full bg-action text-[19px] font-extrabold text-action-ink shadow-card disabled:opacity-70"
          >
            {pending && <LoaderCircle aria-hidden className="size-5 animate-spin" strokeWidth={2.5} />}
            {pending ? 'Låser opp …' : 'Lås opp'}
          </button>
        </form>
      </main>
    </div>
  );
}
