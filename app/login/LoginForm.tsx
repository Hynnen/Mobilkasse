'use client';

import { useActionState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { login, type LoginState } from './actions';

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={action} className="flex w-full flex-col gap-3">
      <label htmlFor="pin" className="text-[15px] font-bold text-ink-2">
        PIN-kode
      </label>
      <input
        id="pin"
        name="pin"
        type="password"
        inputMode="numeric"
        pattern="\d*"
        autoComplete="current-password"
        maxLength={8}
        autoFocus
        required
        aria-invalid={Boolean(state.error)}
        aria-describedby={state.error ? 'pin-error' : undefined}
        className="tabular h-16 rounded-[20px] bg-card px-4 text-center text-3xl tracking-[0.5em] shadow-card outline-none ring-action focus:ring-2 aria-invalid:ring-2 aria-invalid:ring-danger"
      />
      <p id="pin-error" role="alert" className="min-h-6 text-center text-[15px] font-bold text-danger">
        {state.error}
      </p>
      <button
        type="submit"
        disabled={pending}
        className="press flex h-16 items-center justify-center gap-2 rounded-full bg-action text-[19px] font-extrabold text-action-ink shadow-card disabled:opacity-70"
      >
        {pending && <LoaderCircle aria-hidden className="size-5 animate-spin" strokeWidth={2.5} />}
        {pending ? 'Logger inn …' : 'Logg inn'}
      </button>
    </form>
  );
}
