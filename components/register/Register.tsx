'use client';

import { useCallback, useMemo, useReducer, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, ReceiptText, RefreshCw } from 'lucide-react';
import type { ReturnRequest, ReturnResponse } from '@/app/api/return/route';
import type { SaleRequest, SaleResponse } from '@/app/api/sale/route';
import type { PosItem, StockProblem } from '@/lib/catalog';
import { cartCount, cartLines, cartReducer, cartTotalOre, maxQuantity, type CartLine } from '@/lib/cart';
import { formatKr } from '@/lib/money';
import { groupByProduct, type ProductGroup } from '@/lib/products';
import { CartPanel, type CartNotice } from './CartPanel';
import { LogoutSheet } from './LogoutSheet';
import { PaymentSheet } from './PaymentSheet';
import { ProductCard } from './ProductCard';
import { RecentSalesSheet, type Exchange, type ReturnedItem } from './RecentSalesSheet';
import { SaleSuccess } from './SaleSuccess';
import { VariantSheet } from './VariantSheet';

type Props = { initialItems: PosItem[]; storeName: string; logoUrl?: string };

type SubmitResult = SaleResponse | ReturnResponse | { ok: false; error: 'sale_unknown' | 'offline'; message: string };

type Success = Omit<Parameters<typeof SaleSuccess>[0], 'onDone'>;

const buzz = (ms: number | number[]) => navigator.vibrate?.(ms);

export function Register({ initialItems, storeName, logoUrl }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [cart, dispatch] = useReducer(cartReducer, {});
  const [sheetProductId, setSheetProductId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<CartNotice | null>(null);
  const [problemKeys, setProblemKeys] = useState<Set<string>>(new Set());
  const [success, setSuccess] = useState<Success | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [showSales, setShowSales] = useState(false);
  const [exchange, setExchange] = useState<Exchange | null>(null);
  const [confirmPayment, setConfirmPayment] = useState(false);

  // Utsolgte vises grået ut, men sist, så salgbare varer er først i køen.
  const groups = useMemo(
    () => groupByProduct(items).sort((a, b) => Number(b.inStock) - Number(a.inStock)),
    [items],
  );
  const lines = useMemo(() => cartLines(cart, items), [cart, items]);
  const totalOre = cartTotalOre(lines);
  const count = cartCount(lines);
  // Det kunden skal Vippse; ved bytte trekkes returen fra.
  const dueOre = totalOre - (exchange?.returnOre ?? 0);
  const sheetGroup = groups.find((g) => g.productId === sheetProductId) ?? null;

  /** Endring i kurven betyr at en gammel feilmelding ikke lenger gjelder. */
  const change = useCallback((action: Parameters<typeof dispatch>[0]) => {
    dispatch(action);
    setNotice(null);
    setProblemKeys(new Set());
  }, []);

  /** Henter fersk vareliste fra butikken (hopper over serverens mellomlager). */
  const refresh = useCallback(async (): Promise<PosItem[] | null> => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/products?fresh=1', { cache: 'no-store' });
      if (res.status === 401) {
        router.push('/login');
        return null;
      }
      if (!res.ok) return null;
      const { items: fresh } = (await res.json()) as { items: PosItem[] };
      setItems(fresh);
      return fresh;
    } catch {
      return null;
    } finally {
      setRefreshing(false);
    }
  }, [router]);

  function addItem(item: PosItem) {
    if ((cart[item.key] ?? 0) >= maxQuantity(item)) {
      buzz([30, 40, 30]);
      return;
    }
    buzz(8);
    change({ type: 'add', item });
  }

  function pressProduct(group: ProductGroup) {
    if (group.hasVariants) setSheetProductId(group.productId);
    else addItem(group.items[0]);
  }

  async function submit() {
    if (lines.length === 0 || submitting) return;
    setSubmitting(true);
    setNotice(null);
    setProblemKeys(new Set());

    const saleLines = lines.map((l) => ({ productId: l.item.productId, variationId: l.item.variationId, quantity: l.quantity }));
    const body: SaleRequest | ReturnRequest = exchange
      ? {
          orderId: exchange.orderId,
          returnLines: exchange.picks,
          expectedReturnOre: exchange.returnOre,
          lines: saleLines,
          expectedTotalOre: totalOre,
        }
      : { lines: saleLines, expectedTotalOre: totalOre };

    let result: SubmitResult;
    try {
      const res = await fetch(exchange ? '/api/return' : '/api/sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      result = (await res.json()) as SubmitResult;
    } catch {
      result = navigator.onLine
        ? { ok: false, error: 'sale_unknown', message: 'Mistet forbindelsen. Sjekk ordrene i WooCommerce før du prøver igjen.' }
        : { ok: false, error: 'offline', message: 'Ingen nettforbindelse. Ingenting er registrert. Prøv igjen når du har nett.' };
    } finally {
      setSubmitting(false);
    }

    if (result.ok) {
      buzz(20);
      if ('orderId' in result) {
        setSuccess({ title: 'Salg registrert', amountOre: result.totalOre, caption: `Ordre ${result.number}` });
      } else if (exchange) {
        setSuccess(exchangeSuccess(result.returnOre, result.newOrder?.totalOre ?? totalOre, result.newOrder?.number ?? '', result.number));
        setItems((current) => applyReturn(current, exchange.items));
        setExchange(null);
      }
      // Trekk solgt antall lokalt; serveren oppdaterer varelisten i bakgrunnen.
      setItems((current) => applySale(current, lines));
      dispatch({ type: 'clear' });
      return;
    }

    buzz([40, 60, 40]);
    if (result.error === 'insufficient_stock') {
      setProblemKeys(new Set(result.problems.map((p) => p.key)));
      setItems((current) => applyStockProblems(current, result.problems));
      setNotice({
        tone: 'danger',
        title: 'For lite på lager. Ingenting er registrert.',
        body: result.problems
          .map((p) => (p.reason === 'unavailable' ? `${p.name}: ikke tilgjengelig` : `${p.name}: ${p.available} igjen`))
          .join(' · '),
      });
    } else if (result.error === 'price_changed') {
      await refresh();
      setNotice({
        tone: 'warn',
        title: 'Prisen er endret',
        body: `Ny total er ${formatKr(result.totalOre)}. Vis kunden det nye beløpet før du fullfører.`,
      });
    } else if (result.error === 'return_changed' || result.error === 'not_found') {
      setExchange(null);
      setNotice({ tone: 'danger', title: 'Byttet er avbrutt. Ingenting er registrert.', body: result.message });
    } else if (result.error === 'refund_failed') {
      // Den nye ordren er registrert; bare returen mangler.
      setItems((current) => applySale(current, lines));
      dispatch({ type: 'clear' });
      setExchange(null);
      setNotice({ tone: 'danger', title: 'Returen mangler', body: result.message });
    } else {
      setNotice({ tone: 'danger', title: result.message });
    }
  }

  function startExchange(next: Exchange) {
    setShowSales(false);
    setExchange(next);
    change({ type: 'clear' });
  }

  function cancelExchange() {
    setExchange(null);
    change({ type: 'clear' });
  }

  function finishReturn({ number, returnOre, items: returned }: { number: string; returnOre: number; items: ReturnedItem[] }) {
    buzz(20);
    setShowSales(false);
    setItems((current) => applyReturn(current, returned));
    setSuccess({
      title: 'Retur registrert',
      lead: returnOre > 0 ? 'Gi tilbake på Vipps' : undefined,
      amountOre: returnOre,
      caption: `Ordre ${number}`,
      autoClose: returnOre === 0,
      doneLabel: 'Ferdig',
    });
  }

  const finishSuccess = useCallback(() => setSuccess(null), []);
  const closeLogout = useCallback(() => setConfirmLogout(false), []);
  const closeSales = useCallback(() => setShowSales(false), []);
  const closePayment = useCallback(() => setConfirmPayment(false), []);

  /** Skal kunden betale, må selgeren bekrefte at Vippsen har kommet før noe registreres. */
  function requestSubmit() {
    if (lines.length === 0 || submitting) return;
    if (dueOre > 0) setConfirmPayment(true);
    else void submit();
  }

  return (
    <div className="flex min-h-dvh">
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 bg-ground/90 px-4 backdrop-blur-md md:px-6">
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- logo fra butikkens egen URL, vilkårlig vert
            <img src={logoUrl} alt="" className="size-9 rounded-full object-cover" />
          )}
          <h1 className="min-w-0 flex-1 truncate text-[19px] font-extrabold">{storeName}</h1>
          <button
            type="button"
            onClick={() => setShowSales(true)}
            aria-label="Siste salg: retur og bytte"
            className="press grid size-12 place-items-center rounded-full bg-card text-ink shadow-card"
          >
            <ReceiptText aria-hidden className="size-5" strokeWidth={2.25} />
          </button>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={refreshing}
            aria-label="Oppdater varer og lager"
            className="press grid size-12 place-items-center rounded-full bg-card text-ink shadow-card"
          >
            <RefreshCw aria-hidden className={`size-5 ${refreshing ? 'animate-spin' : ''}`} strokeWidth={2.25} />
          </button>
          <button
            type="button"
            onClick={() => setConfirmLogout(true)}
            aria-label="Logg ut"
            className="press grid size-12 place-items-center rounded-full bg-card text-ink-2 shadow-card"
          >
            <LogOut aria-hidden className="size-5" strokeWidth={2.25} />
          </button>
        </header>

        <main className="px-3 pb-[calc(env(safe-area-inset-bottom)+232px)] pt-1 md:px-6 lg:pb-8">
          {groups.length === 0 ? (
            <p className="mx-auto max-w-sm py-24 text-center text-[17px] text-ink-2">
              Ingen varer å vise. Sjekk at produktene er publisert i nettbutikken.
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 xl:grid-cols-4 2xl:grid-cols-5">
              {groups.map((group, i) => {
                const inCart = group.items.reduce((sum, item) => sum + (cart[item.key] ?? 0), 0);
                const atMax = group.items.every((item) => (cart[item.key] ?? 0) >= maxQuantity(item));
                return (
                  <li key={group.productId} className="flex">
                    <ProductCard
                      group={group}
                      inCart={inCart}
                      atMax={atMax}
                      onPress={() => pressProduct(group)}
                      priority={i < 4}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </main>
      </div>

      <CartPanel
        lines={lines}
        count={count}
        totalOre={totalOre}
        submitting={submitting}
        notice={notice}
        problemKeys={problemKeys}
        onInc={(line: CartLine) => addItem(line.item)}
        onDec={(key) => change({ type: 'dec', key })}
        onRemove={(key) => change({ type: 'remove', key })}
        onClear={() => change({ type: 'clear' })}
        onSubmit={requestSubmit}
        exchange={
          exchange && {
            number: exchange.number,
            returnOre: exchange.returnOre,
            itemCount: exchange.items.reduce((sum, i) => sum + i.quantity, 0),
            onCancel: cancelExchange,
          }
        }
      />

      {sheetGroup && (
        <VariantSheet
          group={sheetGroup}
          cart={cart}
          onPick={(item) => {
            addItem(item);
            setSheetProductId(null);
          }}
          onClose={() => setSheetProductId(null)}
        />
      )}

      {confirmPayment && (
        <PaymentSheet
          amountOre={dueOre}
          onConfirm={() => {
            setConfirmPayment(false);
            void submit();
          }}
          onClose={closePayment}
        />
      )}

      {confirmLogout && <LogoutSheet onClose={closeLogout} />}

      {showSales && <RecentSalesSheet onClose={closeSales} onReturned={finishReturn} onExchange={startExchange} />}

      {success && <SaleSuccess {...success} onDone={finishSuccess} />}
    </div>
  );
}

/** Lagertall etter et fullført salg (lagerstyrte varer uten restordre). */
function applySale(items: PosItem[], lines: CartLine[]): PosItem[] {
  const sold = new Map(lines.map((l) => [l.item.key, l.quantity]));
  return items.map((item) => {
    const qty = sold.get(item.key);
    if (!qty || item.stock === null) return item;
    const stock = Math.max(item.stock - qty, 0);
    return { ...item, stock, inStock: stock > 0 || item.backorder };
  });
}

/** Returnerte varer er tilbake på lager. */
function applyReturn(items: PosItem[], returned: ReturnedItem[]): PosItem[] {
  return items.map((item) => {
    const qty = returned
      .filter((r) => r.productId === item.productId && r.variationId === item.variationId)
      .reduce((sum, r) => sum + r.quantity, 0);
    if (!qty || item.stock === null) return item;
    return { ...item, stock: item.stock + qty, inStock: true };
  });
}

/** Suksess etter bytte: mellomlegget kunden betalte, eller beløpet som skal tilbake på Vipps. */
function exchangeSuccess(returnOre: number, newTotalOre: number, newNumber: string, oldNumber: string): Success {
  const dueOre = newTotalOre - returnOre;
  return {
    title: 'Bytte registrert',
    lead: dueOre > 0 ? 'Kunden betalte' : dueOre < 0 ? 'Gi tilbake på Vipps' : 'Går opp i opp',
    amountOre: dueOre === 0 ? null : Math.abs(dueOre),
    caption: `Ny ordre ${newNumber} · retur på ordre ${oldNumber}`,
    autoClose: dueOre >= 0,
    doneLabel: dueOre < 0 ? 'Ferdig' : 'Neste kunde',
  };
}

/** Ferske lagertall fra serverens sjekk når et salg ble stoppet. */
function applyStockProblems(items: PosItem[], problems: StockProblem[]): PosItem[] {
  const available = new Map(problems.map((p) => [p.key, p]));
  return items.map((item) => {
    const p = available.get(item.key);
    if (!p) return item;
    if (p.reason === 'unavailable') return { ...item, stock: 0, inStock: false };
    return { ...item, stock: p.available, inStock: p.available > 0 || item.backorder };
  });
}
