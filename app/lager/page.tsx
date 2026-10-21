import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { hasStockAccess } from '@/lib/auth';
import { getPosItemsFresh, type PosItem } from '@/lib/catalog';
import { getPublicStoreConfig, isNumericStockPin, isStockEnabled } from '@/lib/config';
import { toStockGroups } from '@/lib/stock';
import { LoadError } from '@/components/register/LoadError';
import { StockEditor } from '@/components/stock/StockEditor';
import { StockUnlock } from '@/components/stock/StockUnlock';

export const metadata: Metadata = { title: 'Lager' };

export default function StockPage() {
  return (
    <Suspense fallback={<StockSkeleton />}>
      <StockLoader />
    </Suspense>
  );
}

async function StockLoader() {
  await connection();
  if (!isStockEnabled()) notFound();
  if (!(await hasStockAccess())) return <StockUnlock numeric={isNumericStockPin()} />;

  // Alltid ferske tall: her telles det, og da må utgangspunktet stemme.
  let items: PosItem[];
  try {
    items = await getPosItemsFresh();
  } catch (err) {
    console.error('[lager] lasting av varer', err);
    return <LoadError storeName={getPublicStoreConfig().name} />;
  }

  return <StockEditor initialGroups={toStockGroups(items)} />;
}

function StockSkeleton() {
  return (
    <div className="mx-auto max-w-2xl" aria-busy="true" aria-label="Laster lager">
      <div className="flex h-16 items-center px-4">
        <div className="h-5 w-32 animate-pulse rounded-full bg-surface" />
      </div>
      <div className="flex flex-col gap-3 px-3">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-[20px] bg-card shadow-card" />
        ))}
      </div>
    </div>
  );
}
