'use client';

import { useEffect, useRef } from 'react';
import { logout } from '@/app/login/actions';

/** Bekreftelse før utlogging: en frivillig skal ikke låse seg ute ved et feiltrykk midt i køen. */
export function LogoutSheet({ onClose }: { onClose: () => void }) {
  const cancel = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancel.current?.focus();
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
        aria-labelledby="logout-title"
        aria-describedby="logout-body"
        className="sheet-up relative w-full max-w-md rounded-t-[28px] bg-ground px-5 pb-[max(env(safe-area-inset-bottom),20px)] pt-6 shadow-float md:rounded-[28px] md:pb-5"
      >
        <h2 id="logout-title" className="text-xl font-extrabold">Logg ut av kassen?</h2>
        <p id="logout-body" className="mt-1.5 text-[15px] leading-snug text-ink-2">
          Du trenger PIN-koden for å logge inn igjen. Kurven tømmes.
        </p>
        <div className="mt-6 flex flex-col gap-2.5">
          <button
            ref={cancel}
            type="button"
            onClick={onClose}
            className="press h-14 rounded-full bg-action text-[17px] font-extrabold text-action-ink shadow-card"
          >
            Bli i kassen
          </button>
          <form action={logout}>
            <button type="submit" className="press h-14 w-full rounded-full text-[17px] font-bold text-danger">
              Logg ut
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
