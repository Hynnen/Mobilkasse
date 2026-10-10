import type { Metadata } from 'next';
import { getPublicStoreConfig } from '@/lib/config';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Logg inn' };

function store(): { name: string; logoUrl?: string } {
  try {
    return getPublicStoreConfig();
  } catch {
    return { name: 'Mobilkasse' };
  }
}

export default function LoginPage() {
  const { name, logoUrl } = store();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-10 px-6 pb-[20dvh]">
      <div className="flex flex-col items-center text-center">
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- logo fra butikkens egen URL, vilkårlig vert
          <img src={logoUrl} alt="" className="mb-4 size-20 rounded-[22px] object-cover shadow-card" />
        )}
        <h1 className="text-[28px] font-extrabold leading-tight">{name}</h1>
        <p className="mt-1 text-[17px] text-ink-2">Logg inn for å åpne kassen</p>
      </div>
      <LoginForm />
    </main>
  );
}
