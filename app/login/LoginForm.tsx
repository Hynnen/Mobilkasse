'use client';

import { useActionState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { login, type LoginState } from './actions';

export function LoginForm({ numeric }: { numeric: boolean }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={action} className="flex w-full flex-col gap-3">
      <label htmlFor="pin" className="text-[15px] font-bold text-ink-2">
        {numeric ? 'PIN-kode' : 'Kode'}
      </label>
      <input
        id="pin"
        name="pin"
        type="password"
        inputMode={numeric ? 'numeric' : 'text'}
        pattern={numeric ? '\\d*' : undefined}
        autoComplete="current-password"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        maxLength={64}
        autoFocus
        required
        aria-invalid={Boolean(state.error)}
        aria-describedby={state.error ? 'pin-error' : undefined}
        className={`tabular h-16 rounded-[20px] bg-card px-4 text-center shadow-card outline-none ring-action focus:ring-2 aria-invalid:ring-2 aria-invalid:ring-danger ${numeric ? 'text-3xl tracking-[0.5em]' : 'text-2xl tracking-[0.15em]'}`}
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
