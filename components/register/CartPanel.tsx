'use client';

import { useState } from 'react';
import { ArrowLeftRight, ChevronUp, LoaderCircle, Minus, Plus, Trash2, X } from 'lucide-react';
import { maxQuantity, type CartLine } from '@/lib/cart';
import { formatKr } from '@/lib/money';
import { useScrollLock } from '@/lib/use-scroll-lock';

export type CartNotice = { tone: 'danger' | 'warn'; title: string; body?: string };

/** Byttemodus: returnerte varer trekkes fra, og summen viser mellomlegget. */
export type CartExchange = { number: string; returnOre: number; itemCount: number; onCancel: () => void };

type Props = {
  lines: CartLine[];
  count: number;
  totalOre: number;
  submitting: boolean;
  notice: CartNotice | null;
  problemKeys: Set<string>;
  onInc: (line: CartLine) => void;
  onDec: (key: string) => void;
  onRemove: (key: string) => void;
  onClear: () => void;
  onSubmit: () => void;
  exchange?: CartExchange | null;
};

/** «Kunden betaler», «Gi tilbake på Vipps» eller «Går opp i opp» ved bytte. */
function dueLabel(dueOre: number): string {
  if (dueOre > 0) return 'Kunden betaler';
  if (dueOre < 0) return 'Gi tilbake på Vipps';
  return 'Går opp i opp';
}

/** Kurv: flytende kapsel nederst på telefon/stående nettbrett, fast sidepanel på store skjermer. */
export function CartPanel(props: Props) {
  const [open, setOpen] = useState(false);
  const { lines, count, problemKeys, exchange } = props;
  const dueOre = props.totalOre - (exchange?.returnOre ?? 0);

  // Ved lagerfeil: vis linjene, så selgeren ser hvilken vare det gjelder.
  const [seenProblems, setSeenProblems] = useState(problemKeys);
  if (problemKeys !== seenProblems) {
    setSeenProblems(problemKeys);
    if (problemKeys.size > 0) setOpen(true);
  }
  const expanded = open && lines.length > 0;
  // Utvidet kurv på telefon: lås siden bak (gjelder ikke sidepanelet på store skjermer).
  useScrollLock(expanded && typeof window !== 'undefined' && !window.matchMedia('(min-width: 1024px)').matches);

  return (
    <>
      {/* Telefon og stående nettbrett */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 lg:hidden">
        {expanded && <div className="fade-in pointer-events-auto fixed inset-0 bg-ink/25" onClick={() => setOpen(false)} aria-hidden />}
        <section
          aria-label="Kurv"
          className="pointer-events-auto relative mx-2.5 mb-[max(env(safe-area-inset-bottom),10px)] flex max-h-[80dvh] flex-col rounded-[26px] bg-card shadow-float md:mx-auto md:max-w-xl"
        >
          {expanded && (
            <div className="flex min-h-0 flex-col">
              <CartLines {...props} />
            </div>
          )}
          <div className="flex flex-col gap-3 px-4 pb-4 pt-3">
            {exchange && <ExchangeBar exchange={exchange} />}
            {props.notice && <Notice notice={props.notice} />}
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              disabled={lines.length === 0}
              aria-expanded={expanded}
              aria-label={count === 0 ? undefined : expanded ? 'Skjul kurven' : 'Vis kurven'}
              className="-mx-1 flex min-h-12 items-center justify-between rounded-xl px-1 text-left disabled:cursor-default"
            >
              <span className={`flex items-center gap-1.5 text-[15px] font-bold ${exchange && dueOre < 0 && count > 0 ? 'text-danger' : 'text-ink-2'}`}>
                {exchange
                  ? count === 0
                    ? 'Legg til nye varer'
                    : dueLabel(dueOre)
                  : count === 0
                    ? 'Trykk på en vare for å starte'
                    : `${count} ${count === 1 ? 'vare' : 'varer'}`}
                {count > 0 && (
                  <ChevronUp aria-hidden className={`size-5 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} strokeWidth={2.5} />
                )}
              </span>
              <Total totalOre={Math.abs(dueOre)} />
            </button>
            <SubmitButton {...props} />
          </div>
        </section>
      </div>

      {/* Liggende nettbrett og større */}
      <aside aria-label="Kurv" className="sticky top-0 hidden h-dvh w-[396px] shrink-0 flex-col justify-end py-3 pr-3 lg:flex">
        {/* Kortet vokser med linjene og står forankret nederst, nær tommelen. */}
        <div className="flex max-h-full min-h-0 flex-col overflow-hidden rounded-[26px] bg-card shadow-float">
        <div className="flex items-baseline justify-between px-5 pb-2 pt-5">
          <h2 className="text-xl font-extrabold">{exchange ? 'Bytte' : 'Kurv'}</h2>
          <span className="text-[15px] font-bold text-ink-2">{count} {count === 1 ? 'vare' : 'varer'}</span>
        </div>
        {lines.length === 0 ? (
          <p className="px-8 py-10 text-center text-[15px] text-ink-2">
            {exchange ? 'Legg til varene kunden bytter til.' : 'Trykk på en vare for å legge den i kurven.'}
          </p>
        ) : (
          <div className="flex min-h-0 flex-col">
            <CartLines {...props} />
          </div>
        )}
        <div className="flex flex-col gap-3 border-t border-line px-5 pb-5 pt-4">
          {exchange && <ExchangeBar exchange={exchange} />}
          {props.notice && <Notice notice={props.notice} />}
          <div className="flex items-end justify-between">
            <span className={`pb-1.5 text-[15px] font-bold ${exchange && dueOre < 0 ? 'text-danger' : 'text-ink-2'}`}>
              {exchange ? dueLabel(dueOre) : 'Å betale'}
            </span>
            <Total totalOre={Math.abs(dueOre)} />
          </div>
          <SubmitButton {...props} />
        </div>
        </div>
      </aside>
    </>
  );
}

function Total({ totalOre }: { totalOre: number }) {
  return (
    <span aria-live="polite" className="overflow-hidden">
      <span key={totalOre} className="roll-in tabular block text-[44px] font-extrabold leading-none tracking-[-0.02em]">
        {formatKr(totalOre)}
      </span>
    </span>
  );
}

function ExchangeBar({ exchange }: { exchange: CartExchange }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface py-1.5 pl-4 pr-1.5">
      <ArrowLeftRight aria-hidden className="size-5 shrink-0 text-ink-2" strokeWidth={2.5} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-bold">Bytte fra ordre {exchange.number}</p>
        <p className="tabular truncate text-[13px] text-ink-2">
          Retur {exchange.itemCount} {exchange.itemCount === 1 ? 'vare' : 'varer'} · −{formatKr(exchange.returnOre)}
        </p>
      </div>
      <button
        type="button"
        onClick={exchange.onCancel}
        aria-label="Avbryt bytte"
        className="press grid size-12 shrink-0 place-items-center rounded-full text-ink-2"
      >
        <X className="size-5" strokeWidth={2.5} />
      </button>
    </div>
  );
}

function SubmitButton({ lines, submitting, onSubmit, exchange }: Props) {
  return (
    <button
      type="button"
      onClick={onSubmit}
      disabled={lines.length === 0 || submitting}
      className="press flex h-16 w-full items-center justify-center gap-2 rounded-full bg-action text-[19px] font-extrabold text-action-ink shadow-card disabled:bg-surface disabled:text-ink-2 disabled:shadow-none"
    >
      {submitting && <LoaderCircle aria-hidden className="size-5 animate-spin" strokeWidth={2.5} />}
      {exchange ? (submitting ? 'Registrerer byttet …' : 'Fullfør bytte') : submitting ? 'Registrerer salget …' : 'Fullfør salg'}
    </button>
  );
}

function Notice({ notice }: { notice: CartNotice }) {
  const tone = notice.tone === 'danger' ? 'bg-danger-ground text-danger' : 'bg-warn-ground text-warn-ink';
  return (
    <div role="alert" className={`rounded-2xl px-4 py-3 ${tone}`}>
      <p className="text-[15px] font-bold">{notice.title}</p>
      {notice.body && <p className="mt-0.5 text-[14px] leading-snug">{notice.body}</p>}
    </div>
  );
}

function CartLines({ lines, problemKeys, onInc, onDec, onRemove, onClear }: Props) {
  return (
    <>
      <ul className="flex min-h-0 flex-col divide-y divide-line overflow-y-auto overscroll-contain px-4 pt-2">
        {lines.map((line) => {
          const { item, quantity } = line;
          const problem = problemKeys.has(item.key);
          const atMax = quantity >= maxQuantity(item);
          return (
            <li key={item.key} className={`flex items-center gap-2 py-2.5 ${problem ? '-mx-2 rounded-xl bg-danger-ground px-2' : ''}`}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-bold">{item.name}</p>
                <p className="tabular truncate text-[13px] text-ink-2">
                  {item.variantLabel ? `${item.variantLabel} · ` : ''}
                  {formatKr(item.priceOre)}
                </p>
                {problem && <p className="text-[13px] font-bold text-danger">For lite på lager</p>}
              </div>
              <div className="flex items-center rounded-full bg-surface">
                <button
                  type="button"
                  onClick={() => onDec(item.key)}
                  aria-label={`Ta bort én ${item.name}`}
                  className="press grid size-12 place-items-center rounded-full"
                >
                  <Minus className="size-5" strokeWidth={2.5} />
                </button>
                <span className="tabular w-7 text-center text-[17px] font-extrabold">{quantity}</span>
                <button
                  type="button"
                  onClick={() => onInc(line)}
                  disabled={atMax}
                  aria-label={`Legg til én ${item.name}`}
                  className="press grid size-12 place-items-center rounded-full disabled:opacity-35"
                >
                  <Plus className="size-5" strokeWidth={2.5} />
                </button>
              </div>
              <span className="tabular hidden w-20 text-right text-[15px] font-extrabold sm:block lg:hidden">{formatKr(item.priceOre * quantity)}</span>
              <button
                type="button"
                onClick={() => onRemove(item.key)}
                aria-label={`Fjern ${item.name} fra kurven`}
                className="press grid size-12 shrink-0 place-items-center rounded-full text-ink-2"
              >
                <Trash2 className="size-[18px]" strokeWidth={2.25} />
              </button>
            </li>
          );
        })}
      </ul>
      <div className="px-4 pb-1 pt-3">
        <button
          type="button"
          onClick={onClear}
          className="press min-h-12 rounded-full px-4 text-[15px] font-bold text-danger"
        >
          Tøm kurv
        </button>
      </div>
    </>
  );
}
