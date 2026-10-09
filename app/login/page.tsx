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
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">{storeName()}</h1>
        <p className="mt-1 text-zinc-600">Kasse</p>
      </div>
      <LoginForm />
    </main>
  );
}
