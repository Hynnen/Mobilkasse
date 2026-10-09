'use client';

import { useActionState } from 'react';
import { login, type LoginState } from './actions';

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={action} className="flex w-full flex-col gap-4">
      <label htmlFor="pin" className="text-sm font-medium text-zinc-600">
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
        className="h-16 rounded-xl border border-zinc-300 bg-white px-4 text-center text-3xl tracking-[0.5em] outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/20"
      />
      <p id="pin-error" role="alert" className="min-h-6 text-center text-base text-red-700">
        {state.error}
      </p>
      <button
        type="submit"
        disabled={pending}
        className="h-14 rounded-xl bg-zinc-900 text-lg font-semibold text-white active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? 'Logger inn …' : 'Logg inn'}
      </button>
    </form>
  );
}
