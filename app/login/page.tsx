import type { Metadata } from 'next';
import { getPublicStoreConfig } from '@/lib/config';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Logg inn' };

function storeName(): string {
  try {
    return getPublicStoreConfig().name;
  } catch {
    return 'Mobilkasse';
  }
}

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-10 px-6 pb-[20dvh]">
      <div className="text-center">
        <h1 className="text-[28px] font-extrabold leading-tight">{storeName()}</h1>
        <p className="mt-1 text-[17px] text-ink-2">Logg inn for å åpne kassen</p>
      </div>
      <LoginForm />
    </main>
  );
}
