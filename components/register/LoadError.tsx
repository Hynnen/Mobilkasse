'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { CloudOff, LoaderCircle } from 'lucide-react';

/** Vises når varene ikke kan hentes fra nettbutikken. */
export function LoadError({ storeName }: { storeName: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="grid size-20 place-items-center rounded-full bg-card text-ink-2 shadow-card">
        <CloudOff aria-hidden className="size-9" strokeWidth={2} />
      </div>
      <div>
        <h1 className="text-2xl font-extrabold">Fikk ikke hentet varene</h1>
        <p className="mt-2 text-[17px] leading-snug text-ink-2">
          {storeName} svarer ikke akkurat nå. Sjekk nettforbindelsen og prøv igjen.
        </p>
      </div>
      <button
        type="button"
        onClick={() => startTransition(() => router.refresh())}
        disabled={pending}
        className="press flex h-16 w-full items-center justify-center gap-2 rounded-full bg-action text-[19px] font-extrabold text-action-ink shadow-card"
      >
        {pending && <LoaderCircle aria-hidden className="size-5 animate-spin" strokeWidth={2.5} />}
        Prøv igjen
      </button>
    </main>
  );
}
