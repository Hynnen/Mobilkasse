'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, LoaderCircle, Lock, Minus, Plus, RefreshCw, Search, X } from 'lucide-react';
import type { StockRequest, StockResponse } from '@/app/api/stock/route';
import { lockStock } from '@/app/lager/actions';
import type { PosItem } from '@/lib/catalog';
import { editedStock, toStockGroups, type StockEdit, type StockGroup, type StockRow } from '@/lib/stock';

type Notice = { tone: 'success' | 'danger'; title: string; body?: string };

const buzz = (ms: number | number[]) => navigator.vibrate?.(ms);

const DISCARD_PROMPT = 'Du har endringer som ikke er lagret. Forkaste dem?';

/**
 * Lagerskjerm: + / − for varemottak (legges til ferskt tall ved lagring),
 * eller trykk på tallet og skriv inn det som er talt. Alt lagres samlet.
 */
export function StockEditor({ initialGroups }: { initialGroups: StockGroup[] }) {
  const router = useRouter();
  const [groups, setGroups] = useState(initialGroups);
  const [edits, setEdits] = useState<Record<string, StockEdit>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const rowsByKey = useMemo(() => new Map(groups.flatMap((g) => g.rows.map((r) => [r.key, r] as const))), [groups]);
  const editCount = Object.keys(edits).length;
  const visible = useMemo(() => filterGroups(groups, query), [groups, query]);

  // Lagret-beskjeden forsvinner av seg selv; feil blir stående.
  useEffect(() => {
    if (notice?.tone !== 'success') return;
    const t = setTimeout(() => setNotice(null), 2500);
    return () => clearTimeout(t);
  }, [notice]);

  // Advarer før appen lukkes eller lastes på nytt med ulagrede endringer.
  useEffect(() => {
    if (editCount === 0) return;
    const onUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [editCount]);

  const setEdit = useCallback((row: StockRow, edit: StockEdit | null) => {
    setEdits((current) => {
      const next = { ...current };
      // Tilbake til utgangspunktet = ingen endring.
      const unchanged = edit === null || (edit.mode === 'add' ? edit.amount === 0 : edit.quantity === row.stock);
      if (unchanged) delete next[row.key];
      else next[row.key] = edit;
      return next;
    });
    setErrors((current) => {
      if (!(row.key in current)) return current;
      const next = { ...current };
      delete next[row.key];
      return next;
    });
    setNotice(null);
  }, []);

  const step = useCallback(
    (row: StockRow, by: 1 | -1) => {
      const edit = edits[row.key];
      const next: StockEdit =
        edit?.mode === 'set'
          ? { mode: 'set', quantity: edit.quantity + by }
          : { mode: 'add', amount: (edit?.amount ?? 0) + by };
      if (editedStock(row.stock, next) < 0) {
        buzz([30, 40, 30]);
        return;
      }
      buzz(8);
      setEdit(row, next);
    },
    [edits, setEdit],
  );

  async function refresh() {
    setRefreshing(true);
    try {
      const res = await fetch('/api/products?fresh=1', { cache: 'no-store' });
      if (res.status === 401) return router.push('/login');
      if (!res.ok) throw new Error();
      const { items } = (await res.json()) as { items: PosItem[] };
      setGroups(toStockGroups(items));
      setErrors({});
    } catch {
      setNotice({ tone: 'danger', title: 'Fikk ikke hentet lagertallene.', body: 'Sjekk nettforbindelsen og prøv igjen.' });
    } finally {
      setRefreshing(false);
    }
  }

  async function save() {
    if (editCount === 0 || saving) return;
    setSaving(true);
    setNotice(null);

    const changes: StockRequest['changes'] = Object.entries(edits).flatMap(([key, edit]) => {
      const row = rowsByKey.get(key);
      return row ? [{ productId: row.productId, variationId: row.variationId, ...edit }] : [];
    });

    let result: StockResponse;
    try {
      const res = await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes } satisfies StockRequest),
      });
      if (res.status === 401) return router.push('/login');
      result = (await res.json()) as StockResponse;
    } catch {
      buzz([40, 60, 40]);
      setNotice({
        tone: 'danger',
        title: 'Mistet forbindelsen.',
        body: 'Noe kan være lagret. Trykk Oppdater og sjekk tallene før du lagrer på nytt.',
      });
      return;
    } finally {
      setSaving(false);
    }

    if (!result.ok) {
      buzz([40, 60, 40]);
      setNotice({ tone: 'danger', title: result.message });
      if (result.error === 'forbidden') router.refresh(); // viser kodefeltet igjen
      return;
    }

    const byKey = new Map(result.results.map((r) => [r.key, r]));
    const failed = result.results.filter((r) => !r.ok);

    // Lagrede rader får nytt tall; feilede beholder endringen og får ferskt tall hvis vi har det.
    setGroups((current) =>
      current.map((g) => ({
        ...g,
        rows: g.rows.map((row) => {
          const r = byKey.get(row.key);
          if (!r || (!r.ok && r.stock === undefined)) return row;
          return { ...row, stock: r.stock ?? null };
        }),
      })),
    );
    setEdits((current) => Object.fromEntries(Object.entries(current).filter(([key]) => byKey.get(key)?.ok === false)));
    setErrors(Object.fromEntries(failed.map((r) => [r.key, r.ok ? '' : r.message])));

    if (failed.length === 0) {
      buzz(20);
      setNotice({ tone: 'success', title: `Lagret ${changes.length} ${changes.length === 1 ? 'endring' : 'endringer'}` });
    } else {
      buzz([40, 60, 40]);
      const saved = changes.length - failed.length;
      setNotice({
        tone: 'danger',
        title: saved > 0 ? `${saved} av ${changes.length} lagret` : 'Ingenting ble lagret',
        body: 'Radene merket med rødt er ikke lagret.',
      });
    }
  }

  /** Ulagrede endringer forsvinner hvis man går ut; spør først. */
  function guardLeave(e: MouseEvent) {
    if (editCount > 0 && !window.confirm(DISCARD_PROMPT)) e.preventDefault();
  }

  const showBar = editCount > 0 || notice !== null;

  return (
    <div className="mx-auto min-h-dvh max-w-2xl">
      <header className="sticky top-0 z-20 flex h-16 items-center gap-2 bg-ground/90 px-2 backdrop-blur-md md:px-4">
        <Link
          href="/"
          onClick={guardLeave}
          className="press flex h-12 items-center gap-1.5 rounded-full px-3 text-[17px] font-bold text-ink-2"
        >
          <ArrowLeft aria-hidden className="size-5" strokeWidth={2.5} />
          Kasse
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-center text-[19px] font-extrabold">Lager</h1>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={refreshing}
          aria-label="Hent ferske lagertall"
          className="press grid size-12 place-items-center rounded-full bg-card text-ink shadow-card"
        >
          <RefreshCw aria-hidden className={`size-5 ${refreshing ? 'animate-spin' : ''}`} strokeWidth={2.25} />
        </button>
        <form action={lockStock} onSubmit={(e) => editCount > 0 && !window.confirm(DISCARD_PROMPT) && e.preventDefault()}>
          <button
            type="submit"
            aria-label="Lås lager"
            className="press grid size-12 place-items-center rounded-full bg-card text-ink-2 shadow-card"
          >
            <Lock aria-hidden className="size-5" strokeWidth={2.25} />
          </button>
        </form>
      </header>

      <main className={`px-3 pt-1 md:px-4 ${showBar ? 'pb-[calc(env(safe-area-inset-bottom)+180px)]' : 'pb-10'}`}>
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-2" strokeWidth={2.25} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Søk etter vare"
            aria-label="Søk etter vare"
            enterKeyHint="search"
            className="h-14 w-full rounded-full bg-card pl-12 pr-12 text-[17px] shadow-card outline-none ring-action placeholder:text-ink-2 focus:ring-2 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Tøm søk"
              className="press absolute right-1 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full text-ink-2"
            >
              <X className="size-5" strokeWidth={2.5} />
            </button>
          )}
        </div>
        <p className="px-2 pb-1 pt-3 text-[14px] leading-snug text-ink-2">
          Trykk + når det kommer varer. Har du talt opp, trykk på tallet og skriv inn det du har.
        </p>

        {visible.length === 0 ? (
          <p className="py-16 text-center text-[17px] text-ink-2">
            {groups.length === 0 ? 'Ingen varer å vise.' : `Ingen varer som passer «${query.trim()}».`}
          </p>
        ) : (
          <div className="mt-2 flex flex-col gap-4">
            {visible.map((group) => (
              <section key={group.productId} aria-labelledby={`stock-${group.productId}`}>
                <div className="flex items-center gap-3 px-1 pb-2">
                  {group.image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- produktbilde fra butikkens egen vert
                    <img src={group.image} alt="" loading="lazy" className="size-10 shrink-0 rounded-xl bg-surface object-cover" />
                  ) : (
                    <span aria-hidden className="size-10 shrink-0 rounded-xl bg-surface" />
                  )}
                  <h2 id={`stock-${group.productId}`} className="min-w-0 text-[17px] font-extrabold leading-tight">
                    {group.name}
                  </h2>
                </div>
                <ul className="divide-y divide-line overflow-hidden rounded-[20px] bg-card shadow-card">
                  {group.rows.map((row) => (
                    <StockRowItem
                      key={row.key}
                      row={row}
                      edit={edits[row.key]}
                      error={errors[row.key]}
                      productName={group.name}
                      onStep={step}
                      onSet={(quantity) => setEdit(row, { mode: 'set', quantity })}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>

      {showBar && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30">
          <section
            aria-label="Lagre endringer"
            className="roll-in pointer-events-auto mx-2.5 mb-[max(env(safe-area-inset-bottom),10px)] flex flex-col gap-3 rounded-[26px] bg-card px-4 pb-4 pt-4 shadow-float md:mx-auto md:max-w-xl"
          >
            {notice && <NoticeBox notice={notice} />}
            {editCount > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEdits({});
                    setErrors({});
                    setNotice(null);
                  }}
                  disabled={saving}
                  className="press h-16 shrink-0 rounded-full px-5 text-[17px] font-bold text-ink-2"
                >
                  Angre
                </button>
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={saving}
                  className="press flex h-16 flex-1 items-center justify-center gap-2 rounded-full bg-action text-[19px] font-extrabold text-action-ink shadow-card disabled:opacity-70"
                >
                  {saving && <LoaderCircle aria-hidden className="size-5 animate-spin" strokeWidth={2.5} />}
                  {saving ? 'Lagrer …' : `Lagre ${editCount} ${editCount === 1 ? 'endring' : 'endringer'}`}
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

type RowProps = {
  row: StockRow;
  edit: StockEdit | undefined;
  error: string | undefined;
  productName: string;
  onStep: (row: StockRow, by: 1 | -1) => void;
  onSet: (quantity: number) => void;
};

function StockRowItem({ row, edit, error, productName, onStep, onSet }: RowProps) {
  const [typing, setTyping] = useState(false);
  const cancelled = useRef(false);
  const name = row.label ? `${productName} ${row.label}` : productName;
  const value = edit ? editedStock(row.stock, edit) : row.stock;

  function commit(text: string) {
    setTyping(false);
    if (cancelled.current) {
      cancelled.current = false;
      return;
    }
    const trimmed = text.trim();
    if (/^\d{1,5}$/.test(trimmed)) onSet(Number(trimmed));
  }

  return (
    <li className={`flex min-h-[72px] items-center gap-3 py-2 pl-4 pr-2 ${error ? 'bg-danger-ground' : ''}`}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[17px] font-bold">{row.label ?? 'Antall på lager'}</p>
        <RowStatus row={row} edit={edit} />
        {error && <p className="text-[13px] font-bold leading-snug text-danger">{error}</p>}
      </div>

      <div className="flex shrink-0 items-center rounded-full bg-surface">
        <button
          type="button"
          onClick={() => onStep(row, -1)}
          disabled={(value ?? 0) <= 0}
          aria-label={`Én færre ${name}`}
          className="press grid size-14 place-items-center rounded-full disabled:opacity-35"
        >
          <Minus className="size-5" strokeWidth={2.5} />
        </button>
        {typing ? (
          <input
            type="text"
            inputMode="numeric"
            pattern="\d*"
            maxLength={5}
            defaultValue={value ?? ''}
            autoFocus
            onFocus={(e) => e.currentTarget.select()}
            onBlur={(e) => commit(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
              if (e.key === 'Escape') {
                cancelled.current = true;
                e.currentTarget.blur();
              }
            }}
            aria-label={`Antall ${name}`}
            className="tabular h-12 w-16 rounded-xl bg-card text-center text-[19px] font-extrabold outline-none ring-2 ring-action"
          />
        ) : (
          <button
            type="button"
            onClick={() => setTyping(true)}
            aria-label={`Skriv inn antall ${name}, nå ${value ?? 'ikke lagerstyrt'}`}
            className={`tabular h-14 min-w-16 rounded-xl px-1 text-[19px] font-extrabold ${edit ? 'text-ink underline decoration-action decoration-[3px] underline-offset-4' : value === 0 ? 'text-danger' : ''}`}
          >
            {value ?? '–'}
          </button>
        )}
        <button
          type="button"
          onClick={() => onStep(row, 1)}
          aria-label={`Én flere ${name}`}
          className="press grid size-14 place-items-center rounded-full"
        >
          <Plus className="size-5" strokeWidth={2.5} />
        </button>
      </div>
    </li>
  );
}

function RowStatus({ row, edit }: { row: StockRow; edit: StockEdit | undefined }) {
  if (edit) {
    const before = row.stock ?? 'Ikke styrt';
    const tag =
      edit.mode === 'set' ? 'Talt' : edit.amount > 0 ? `+${edit.amount}` : `−${-edit.amount}`;
    return (
      <p className="tabular flex items-center gap-1.5 text-[13px] text-ink-2">
        <span>
          {before} → <span className="font-extrabold text-ink">{editedStock(row.stock, edit)}</span>
        </span>
        <span className="rounded-full bg-action px-2 py-px text-[12px] font-extrabold text-action-ink">{tag}</span>
      </p>
    );
  }
  if (row.stock === null) return <p className="text-[13px] text-ink-2">Ikke lagerstyrt</p>;
  if (row.stock <= 0 && !row.backorder) return <p className="text-[13px] font-bold text-danger">Utsolgt</p>;
  return (
    <p className="tabular text-[13px] text-ink-2">
      {row.stock} på lager{row.backorder ? ' · restordre tillatt' : ''}
    </p>
  );
}

function NoticeBox({ notice }: { notice: Notice }) {
  const tone = notice.tone === 'danger' ? 'bg-danger-ground text-danger' : 'bg-success-ground text-success';
  return (
    <div role={notice.tone === 'danger' ? 'alert' : 'status'} className={`rounded-2xl px-4 py-3 ${tone}`}>
      <p className="text-[15px] font-bold">{notice.title}</p>
      {notice.body && <p className="mt-0.5 text-[14px] leading-snug">{notice.body}</p>}
    </div>
  );
}

/** Treff på produktnavn viser alle radene; treff på variant viser bare de radene. */
function filterGroups(groups: StockGroup[], query: string): StockGroup[] {
  const q = query.trim().toLocaleLowerCase('nb');
  if (!q) return groups;
  return groups.flatMap((g) => {
    if (g.name.toLocaleLowerCase('nb').includes(q)) return [g];
    const rows = g.rows.filter((r) => r.label?.toLocaleLowerCase('nb').includes(q));
    return rows.length > 0 ? [{ ...g, rows }] : [];
  });
}
