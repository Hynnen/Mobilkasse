import { Suspense } from 'react';
import { connection } from 'next/server';
import { getPosItems, type PosItem } from '@/lib/catalog';
import { getPublicStoreConfig } from '@/lib/config';
import { Register } from '@/components/register/Register';
import { LoadError } from '@/components/register/LoadError';

export default function Home() {
  return (
    <Suspense fallback={<RegisterSkeleton />}>
      <RegisterLoader />
    </Suspense>
  );
}

async function RegisterLoader() {
  await connection(); // alltid ferskt lager
  const store = getPublicStoreConfig();

  let items: PosItem[];
  try {
    items = await getPosItems();
  } catch (err) {
    console.error('[kasse] lasting av varer', err);
    return <LoadError storeName={store.name} />;
  }

  return <Register initialItems={items} storeName={store.name} logoUrl={store.logoUrl} />;
}

function RegisterSkeleton() {
  return (
    <div className="flex min-h-dvh" aria-busy="true" aria-label="Laster varer">
      <div className="flex-1">
        <div className="flex h-16 items-center px-4 md:px-6">
          <div className="h-5 w-40 animate-pulse rounded-full bg-surface" />
        </div>
        <ul className="grid grid-cols-2 gap-3 px-3 sm:grid-cols-3 md:gap-4 md:px-6 xl:grid-cols-4 2xl:grid-cols-5">
          {Array.from({ length: 8 }, (_, i) => (
            <li key={i} className="min-h-56 rounded-[20px] bg-card p-1.5 shadow-card">
              <div className="aspect-[4/3] animate-pulse rounded-[15px] bg-surface" />
              <div className="mx-1.5 mt-3 h-4 w-3/4 animate-pulse rounded-full bg-surface" />
              <div className="mx-1.5 mt-3 h-4 w-1/3 animate-pulse rounded-full bg-surface" />
            </li>
          ))}
        </ul>
      </div>
      <div className="hidden w-[396px] py-3 pr-3 lg:block"><div className="h-full rounded-[26px] bg-card shadow-float" /></div>
    </div>
  );
}
