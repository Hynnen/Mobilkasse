import 'server-only';
import { itemKey } from './catalog';
import { toDecimal, toOre } from './money';
import { returnableQuantity, returnOre, type ReturnPick, type SaleDetail, type SaleSummary } from './sales';
import {
  createRefund,
  getOrder,
  listOrders,
  listRefunds,
  orNullOn404,
  ORDER_PAYMENT_METHOD,
  type CreateRefundInput,
  type WooOrder,
  type WooRefund,
} from './woo';

const RECENT_DAYS = 30;
/** Bare betalte salg kan returneres. «refunded» tas med så fullt returnerte salg fortsatt vises. */
const RETURNABLE_STATUSES = ['completed', 'refunded'];

const isOverDiskSale = (o: WooOrder) =>
  o.payment_method === ORDER_PAYMENT_METHOD && RETURNABLE_STATUSES.includes(o.status);

/** «-299.00» → 29900 */
const absOre = (amount: string) => toOre(amount.replace(/^-/, '')) ?? 0;

function toSummary(o: WooOrder): SaleSummary {
  return {
    id: o.id,
    number: o.number,
    createdAt: `${o.date_created_gmt}Z`,
    totalOre: toOre(o.total) ?? 0,
    refundedOre: o.refunds.reduce((sum, r) => sum + absOre(r.total), 0),
    note: o.customer_note,
    items: o.line_items.map((l) => ({ name: l.name, quantity: l.quantity })),
  };
}

/** Salg over disk de siste 30 dagene, nyeste først (maks de 100 siste ordrene i butikken). */
export async function listRecentSales(): Promise<SaleSummary[]> {
  const after = new Date(Date.now() - RECENT_DAYS * 86_400_000).toISOString();
  const orders = await listOrders({
    after,
    status: RETURNABLE_STATUSES.join(','),
    per_page: 100,
    orderby: 'date',
    order: 'desc',
  });
  return orders.filter(isOverDiskSale).map(toSummary);
}

/**
 * Finner et salg på ordrenummer, uansett dato. Ordrenummer er vanligvis lik ID-en,
 * men tillegg for løpende nummerering kan gi andre nummer, så søk brukes som reserve.
 */
export async function findSaleByNumber(number: string): Promise<SaleSummary | null> {
  const id = Number(number);
  if (Number.isSafeInteger(id) && id > 0) {
    const order = await orNullOn404(getOrder(id));
    if (order && order.number === number && isOverDiskSale(order)) return toSummary(order);
  }
  const hits = await listOrders({ search: number, per_page: 20 });
  const hit = hits.find((o) => o.number === number && isOverDiskSale(o));
  return hit ? toSummary(hit) : null;
}

/** Antall som allerede er refundert per vare (refusjonslinjer har negativt antall). */
function refundedQuantities(refunds: WooRefund[]): Map<string, number> {
  const qty = new Map<string, number>();
  for (const refund of refunds) {
    for (const l of refund.line_items) {
      const key = itemKey(l.product_id, l.variation_id);
      qty.set(key, (qty.get(key) ?? 0) + Math.abs(l.quantity));
    }
  }
  return qty;
}

export type LoadedSale = { order: WooOrder; detail: SaleDetail };

/** Ferskt salg med hva som fortsatt kan returneres, eller null hvis det ikke er et betalt salg over disk. */
export async function loadSale(id: number): Promise<LoadedSale | null> {
  const [order, refunds] = await Promise.all([orNullOn404(getOrder(id)), orNullOn404(listRefunds(id))]);
  if (!order || !isOverDiskSale(order)) return null;

  const refunded = refundedQuantities(refunds ?? []);
  const lines = order.line_items
    .filter((l) => l.quantity > 0)
    .map((l) => {
      const key = itemKey(l.product_id, l.variation_id);
      // Samme vare på flere linjer: fordel refundert antall fra første linje og utover.
      const left = refunded.get(key) ?? 0;
      const returned = Math.min(left, l.quantity);
      refunded.set(key, left - returned);

      const lineTotalOre = (toOre(l.total) ?? 0) + (toOre(l.total_tax) ?? 0);
      return {
        lineId: l.id,
        productId: l.product_id,
        variationId: l.variation_id,
        name: l.name,
        quantity: l.quantity,
        returned,
        unitOre: Math.round(lineTotalOre / l.quantity),
        lineTotalOre,
      };
    });

  return { order, detail: { ...toSummary(order), lines } };
}

export type ReturnPlan = { ok: true; amountOre: number; body: Omit<CreateRefundInput, 'reason'> } | { ok: false };

/**
 * Regner ut refusjonen for valgte varer. Feiler hvis en linje ikke finnes eller
 * det velges flere enn det som kan returneres (f.eks. returnert fra en annen telefon).
 */
export function planReturn({ order, detail }: LoadedSale, picks: ReturnPick[]): ReturnPlan {
  const lineItems: CreateRefundInput['line_items'] = [];
  let amountOre = 0;

  for (const pick of picks) {
    const line = detail.lines.find((l) => l.lineId === pick.lineId);
    const wooLine = order.line_items.find((l) => l.id === pick.lineId);
    if (!line || !wooLine || pick.quantity > returnableQuantity(line)) return { ok: false };

    // Beløpet inkl. mva er det kassen viste; mva fordeles forholdsmessig per avgiftssats.
    const lineOre = returnOre(line, pick.quantity);
    const refundTax = wooLine.taxes.map((t) => ({
      id: t.id,
      ore: Math.round(((toOre(t.total) ?? 0) * pick.quantity) / wooLine.quantity),
    }));
    const taxOre = refundTax.reduce((sum, t) => sum + t.ore, 0);

    lineItems.push({
      id: pick.lineId,
      quantity: pick.quantity,
      refund_total: Math.max(lineOre - taxOre, 0) / 100,
      refund_tax: refundTax.map((t) => ({ id: t.id, refund_total: t.ore / 100 })),
    });
    amountOre += lineOre;
  }

  return {
    ok: true,
    amountOre,
    body: { amount: toDecimal(amountOre), api_refund: false, api_restock: true, line_items: lineItems },
  };
}

/** Registrerer refusjonen. WooCommerce legger varene tilbake på lager. */
export function registerReturn(orderId: number, plan: Extract<ReturnPlan, { ok: true }>, reason: string) {
  return createRefund(orderId, { ...plan.body, reason });
}
