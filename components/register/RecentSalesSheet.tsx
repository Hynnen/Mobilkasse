'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftRight, ChevronLeft, ChevronRight, LoaderCircle, Minus, Plus, Search, X } from 'lucide-react';
import type { SaleDetailResponse } from '@/app/api/orders/[id]/route';
import type { SalesResponse } from '@/app/api/orders/route';
import type { ReturnRequest, ReturnResponse } from '@/app/api/return/route';
import { formatKr } from '@/lib/money';
import {
  isFullyReturned,
  returnableQuantity,
  returnTotalOre,
  type ReturnPick,
  type SaleDetail,
  type SaleSummary,
} from '@/lib/sales';
import { useScrollLock } from '@/lib/use-scroll-lock';

/** Varer som går tilbake på lager (for lokal oppdatering av lagertall). */
export type ReturnedItem = { productId: number; variationId: number; quantity: number };

/** Bytte som er startet fra et salg: kassen åpnes med disse varene som kreditt. */
export type Exchange = {
  orderId: number;
  number: string;
  picks: ReturnPick[];
  returnOre: number;
  items: (ReturnedItem & { name: string })[];
};

type Props = {
  onClose: () => void;
  onReturned: (result: { number: string; returnOre: number; items: ReturnedItem[] }) => void;
  onExchange: (exchange: Exchange) => void;
};

type Load<T> = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: T };

const time = new Intl.DateTimeFormat('nb-NO', { hour: '2-digit', minute: '2-digit' });
const day = new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'short' });

function when(iso: string): string {
  const d = new Date(iso);
  const days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86_400_000);
  const prefix = days === 0 ? 'I dag' : days === 1 ? 'I går' : day.format(d);
  return `${prefix} ${time.format(d)}`;
}

/** «Siste salg»: finn salget kunden kommer tilbake med, velg varer, og registrer retur eller start bytte. */
export function RecentSalesSheet({ onClose, onReturned, onExchange }: Props) {
  const [openId, setOpenId] = useState<number | null>(null);
  useScrollLock();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center md:items-center">
      <div className="fade-in absolute inset-0 bg-ink/35" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sales-title"
        className="sheet-up relative flex h-[85dvh] w-full max-w-lg flex-col rounded-t-[28px] bg-ground pb-[max(env(safe-area-inset-bottom),16px)] shadow-float md:h-[80dvh] md:rounded-[28px] md:pb-4"
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-line md:hidden" aria-hidden />
        {openId === null ? (
          <SaleList onOpen={setOpenId} onClose={onClose} />
        ) : (
          <SaleReturn
            key={openId}
            id={openId}
            onBack={() => setOpenId(null)}
            onReturned={onReturned}
            onExchange={onExchange}
          />
        )}
      </div>
    </div>
  );
}

function useApi() {
  const router = useRouter();
  return useCallback(
    async <T,>(url: string, init?: RequestInit): Promise<T | null> => {
      const res = await fetch(url, { cache: 'no-store', ...init });
      if (res.status === 401) {
        router.push('/login');
        return null;
      }
      return (await res.json()) as T;
    },
    [router],
  );
}

function SaleList({ onOpen, onClose }: { onOpen: (id: number) => void; onClose: () => void }) {
  const api = useApi();
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState('');
  const [load, setLoad] = useState<Load<SaleSummary[]>>({ status: 'loading' });

  const fetchSales = useCallback(
    async (q: string) => {
      setLoad({ status: 'loading' });
      setSearched(q);
      try {
        const body = await api<SalesResponse>(q ? `/api/orders?q=${encodeURIComponent(q)}` : '/api/orders');
        if (!body) return;
        setLoad(body.ok ? { status: 'ready', data: body.sales } : { status: 'error', message: body.message });
      } catch {
        setLoad({ status: 'error', message: 'Ingen nettforbindelse. Prøv igjen.' });
      }
    },
    [api],
  );

  useEffect(() => {
    // Første lasting når arket åpnes
    // eslint-disable-next-line react-hooks/set-state-in-effect -- henter data fra nettbutikken
    void fetchSales('');
  }, [fetchSales]);

  return (
    <>
      <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-3">
        <div>
          <h2 id="sales-title" className="text-xl font-extrabold leading-tight">Siste salg</h2>
          <p className="mt-0.5 text-[15px] text-ink-2">Velg salget kunden kommer tilbake med</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Lukk"
          className="press -mr-1 grid size-12 shrink-0 place-items-center rounded-full bg-card text-ink shadow-card"
        >
          <X className="size-5" strokeWidth={2.5} />
        </button>
      </div>

      <form
        role="search"
        className="flex gap-2 px-4 pb-3"
        onSubmit={(e) => {
          e.preventDefault();
          void fetchSales(query.trim());
        }}
      >
        <label className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-full bg-card px-4 shadow-card">
          <Search aria-hidden className="size-[18px] shrink-0 text-ink-2" strokeWidth={2.5} />
          <span className="sr-only">Ordrenummer</span>
          <input
            type="search"
            inputMode="numeric"
            enterKeyHint="search"
            placeholder="Søk på ordrenummer"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value === '' && searched) void fetchSales('');
            }}
            className="min-w-0 flex-1 bg-transparent text-[17px] font-bold outline-none placeholder:font-normal placeholder:text-ink-2"
          />
        </label>
        <button type="submit" className="press h-12 rounded-full bg-card px-5 text-[15px] font-extrabold shadow-card">
          Søk
        </button>
      </form>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-2">
        {load.status === 'loading' && (
          <ul className="flex flex-col gap-2" aria-busy="true" aria-label="Laster salg">
            {Array.from({ length: 5 }, (_, i) => (
              <li key={i} className="h-[76px] animate-pulse rounded-[18px] bg-card/70" />
            ))}
          </ul>
        )}
        {load.status === 'error' && <ErrorState message={load.message} onRetry={() => void fetchSales(searched)} />}
        {load.status === 'ready' && load.data.length === 0 && (
          <p className="px-6 py-14 text-center text-[15px] text-ink-2">
            {searched ? `Fant ikke salg over disk med ordrenummer ${searched}.` : 'Ingen salg over disk de siste 30 dagene.'}
          </p>
        )}
        {load.status === 'ready' && load.data.length > 0 && (
          <>
            <ul className="flex flex-col gap-2">
              {load.data.map((sale) => (
                <li key={sale.id}>
                  <SaleRow sale={sale} onOpen={() => onOpen(sale.id)} />
                </li>
              ))}
            </ul>
            {!searched && (
              <p className="px-4 pb-2 pt-4 text-center text-[13px] text-ink-2">
                Viser de siste 30 dagene. Eldre salg finner du med ordrenummeret.
              </p>
            )}
          </>
        )}
      </div>
    </>
  );
}

function SaleRow({ sale, onOpen }: { sale: SaleSummary; onOpen: () => void }) {
  const full = isFullyReturned(sale);
  const items = sale.items.map((i) => (i.quantity > 1 ? `${i.quantity} × ${i.name}` : i.name)).join(', ');
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`press flex min-h-16 w-full items-center gap-3 rounded-[18px] bg-card px-4 py-3 text-left shadow-card ${full ? 'opacity-60' : ''}`}
    >
      <span className="min-w-0 flex-1">
        <span className="tabular block text-[13px] text-ink-2">
          {when(sale.createdAt)} · Ordre {sale.number}
        </span>
        <span className="block truncate text-[15px] font-bold">{items}</span>
        {sale.refundedOre > 0 && (
          <span className="tabular block text-[13px] font-bold text-ink-2">
            {full ? 'Returnert' : `Delvis returnert (${formatKr(sale.refundedOre)})`}
          </span>
        )}
      </span>
      <span className="tabular text-[17px] font-extrabold">{formatKr(sale.totalOre)}</span>
      <ChevronRight aria-hidden className="-mr-1 size-5 shrink-0 text-ink-2" strokeWidth={2.5} />
    </button>
  );
}

type ReturnProps = {
  id: number;
  onBack: () => void;
  onReturned: Props['onReturned'];
  onExchange: Props['onExchange'];
};

function SaleReturn({ id, onBack, onReturned, onExchange }: ReturnProps) {
  const api = useApi();
  const [load, setLoad] = useState<Load<SaleDetail>>({ status: 'loading' });
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const backButton = useRef<HTMLButtonElement>(null);

  const fetchSale = useCallback(async () => {
    setLoad({ status: 'loading' });
    setPicked({});
    setError(null);
    try {
      const body = await api<SaleDetailResponse>(`/api/orders/${id}`);
      if (!body) return;
      setLoad(body.ok ? { status: 'ready', data: body.sale } : { status: 'error', message: body.message });
    } catch {
      setLoad({ status: 'error', message: 'Ingen nettforbindelse. Prøv igjen.' });
    }
  }, [api, id]);

  useEffect(() => {
    backButton.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- henter data fra nettbutikken
    void fetchSale();
  }, [fetchSale]);

  const sale = load.status === 'ready' ? load.data : null;
  const picks: ReturnPick[] = Object.entries(picked)
    .filter(([, q]) => q > 0)
    .map(([lineId, quantity]) => ({ lineId: Number(lineId), quantity }));
  const returnOre = sale ? returnTotalOre(sale.lines, picks) : 0;
  const pickedItems = sale
    ? picks.flatMap((p) => {
        const line = sale.lines.find((l) => l.lineId === p.lineId);
        return line ? [{ productId: line.productId, variationId: line.variationId, quantity: p.quantity, name: line.name }] : [];
      })
    : [];
  const nothingLeft = sale !== null && sale.lines.every((l) => returnableQuantity(l) === 0);

  function setQty(lineId: number, quantity: number) {
    setError(null);
    setPicked((p) => ({ ...p, [lineId]: quantity }));
  }

  async function submitReturn() {
    if (!sale || picks.length === 0 || submitting) return;
    setSubmitting(true);
    setError(null);

    const request: ReturnRequest = { orderId: sale.id, returnLines: picks, expectedReturnOre: returnOre };
    let result: ReturnResponse | null;
    try {
      result = await api<ReturnResponse>('/api/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
    } catch {
      result = {
        ok: false,
        error: 'return_unknown',
        message: navigator.onLine
          ? 'Mistet forbindelsen. Åpne salget på nytt og sjekk om returen ble registrert.'
          : 'Ingen nettforbindelse. Ingenting er registrert.',
      };
    } finally {
      setSubmitting(false);
    }
    if (!result) return;

    if (result.ok) {
      onReturned({ number: result.number, returnOre: result.returnOre, items: pickedItems });
      return;
    }
    navigator.vibrate?.([40, 60, 40]);
    if (result.error === 'return_changed' || result.error === 'return_unknown') {
      await fetchSale();
    }
    setError(result.message);
  }

  return (
    <>
      <div className="flex items-center gap-2 px-3 pb-3 pt-3">
        <button
          ref={backButton}
          type="button"
          onClick={onBack}
          aria-label="Tilbake til siste salg"
          className="press grid size-12 shrink-0 place-items-center rounded-full bg-card text-ink shadow-card"
        >
          <ChevronLeft className="size-5" strokeWidth={2.5} />
        </button>
        <div className="min-w-0 px-1">
          <h2 id="sales-title" className="truncate text-xl font-extrabold leading-tight">
            {sale ? `Ordre ${sale.number}` : 'Salg'}
          </h2>
          {sale && (
            <p className="tabular truncate text-[15px] text-ink-2">
              {when(sale.createdAt)} · {formatKr(sale.totalOre)}
            </p>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-2">
        {load.status === 'loading' && (
          <ul className="flex flex-col gap-2" aria-busy="true" aria-label="Laster salget">
            {Array.from({ length: 2 }, (_, i) => (
              <li key={i} className="h-[76px] animate-pulse rounded-[18px] bg-card/70" />
            ))}
          </ul>
        )}
        {load.status === 'error' && <ErrorState message={load.message} onRetry={() => void fetchSale()} />}
        {sale && (
          <>
            <p className="px-1 pb-2 text-[15px] font-bold text-ink-2">
              {nothingLeft ? 'Alt i dette salget er returnert.' : 'Hvilke varer kommer tilbake?'}
            </p>
            <ul className="flex flex-col gap-2">
              {sale.lines.map((line) => {
                const max = returnableQuantity(line);
                const qty = picked[line.lineId] ?? 0;
                return (
                  <li
                    key={line.lineId}
                    className={`flex min-h-16 items-center gap-2 rounded-[18px] bg-card py-2 pl-4 pr-2 shadow-card ${qty > 0 ? 'ring-2 ring-action' : ''} ${max === 0 ? 'opacity-55' : ''}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-bold leading-snug">{line.name}</p>
                      <p className="tabular text-[13px] text-ink-2">
                        {line.quantity} × {formatKr(line.unitOre)}
                        {line.returned > 0 && ` · ${line.returned} returnert`}
                      </p>
                    </div>
                    {max > 0 && (
                      <div className="flex shrink-0 items-center rounded-full bg-surface">
                        <button
                          type="button"
                          onClick={() => setQty(line.lineId, qty - 1)}
                          disabled={qty === 0}
                          aria-label={`Én færre ${line.name}`}
                          className="press grid size-12 place-items-center rounded-full disabled:opacity-35"
                        >
                          <Minus className="size-5" strokeWidth={2.5} />
                        </button>
                        <span className="tabular w-7 text-center text-[17px] font-extrabold" aria-label={`${qty} av ${max} returneres`}>
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQty(line.lineId, qty + 1)}
                          disabled={qty >= max}
                          aria-label={`Én flere ${line.name}`}
                          className="press grid size-12 place-items-center rounded-full disabled:opacity-35"
                        >
                          <Plus className="size-5" strokeWidth={2.5} />
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {sale && !nothingLeft && (
        <div className="flex flex-col gap-2.5 border-t border-line px-4 pt-3">
          {error && (
            <div role="alert" className="rounded-2xl bg-danger-ground px-4 py-3 text-[15px] font-bold text-danger">
              {error}
            </div>
          )}
          <div className="flex items-end justify-between px-1">
            <span className="pb-1 text-[15px] font-bold text-ink-2">Tilbake til kunden</span>
            <span className="tabular text-[32px] font-extrabold leading-none tracking-[-0.02em]">{formatKr(returnOre)}</span>
          </div>
          <button
            type="button"
            onClick={() => void submitReturn()}
            disabled={picks.length === 0 || submitting}
            className="press flex h-16 w-full items-center justify-center gap-2 rounded-full bg-action text-[19px] font-extrabold text-action-ink shadow-card disabled:bg-surface disabled:text-ink-2 disabled:shadow-none"
          >
            {submitting && <LoaderCircle aria-hidden className="size-5 animate-spin" strokeWidth={2.5} />}
            {submitting ? 'Registrerer returen …' : 'Registrer retur'}
          </button>
          <button
            type="button"
            onClick={() => onExchange({ orderId: sale.id, number: sale.number, picks, returnOre, items: pickedItems })}
            disabled={picks.length === 0 || submitting}
            className="press flex h-14 w-full items-center justify-center gap-2 rounded-full bg-card text-[17px] font-extrabold text-ink shadow-card disabled:opacity-50 disabled:shadow-none"
          >
            <ArrowLeftRight aria-hidden className="size-5" strokeWidth={2.5} />
            Bytt til andre varer
          </button>
        </div>
      )}
    </>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-14 text-center">
      <p className="text-[15px] font-bold text-danger">{message}</p>
      <button type="button" onClick={onRetry} className="press h-12 rounded-full bg-card px-6 text-[15px] font-extrabold shadow-card">
        Prøv igjen
      </button>
    </div>
  );
}
