/** Ett salg over disk, slik «Siste salg» viser det. Beløp i øre inkl. mva. */
export type SaleSummary = {
  id: number;
  number: string;
  createdAt: string; // ISO (UTC)
  totalOre: number;
  refundedOre: number;
  note: string;
  items: { name: string; quantity: number }[];
};

/** En ordrelinje som kan returneres. */
export type ReturnableLine = {
  lineId: number;
  productId: number;
  variationId: number;
  name: string;
  quantity: number; // kjøpt
  returned: number; // allerede returnert
  unitOre: number; // pris per stk inkl. mva
  lineTotalOre: number; // betalt for linjen inkl. mva
};

export type SaleDetail = SaleSummary & { lines: ReturnableLine[] };

/** Varer som skal returneres: antall per ordrelinje. */
export type ReturnPick = { lineId: number; quantity: number };

export const returnableQuantity = (line: ReturnableLine) => Math.max(line.quantity - line.returned, 0);

/**
 * Beløp kunden skal ha tilbake for `quantity` stk av linjen. Returneres resten
 * av linjen, får kunden resten av beløpet, så avrunding aldri gir mer enn kunden betalte.
 * Brukes likt i kassen og på serveren, så beløpet selgeren ser er det som registreres.
 */
export function returnOre(line: ReturnableLine, quantity: number): number {
  if (quantity <= 0) return 0;
  if (quantity >= returnableQuantity(line)) return Math.max(line.lineTotalOre - line.unitOre * line.returned, 0);
  return line.unitOre * quantity;
}

export function returnTotalOre(lines: ReturnableLine[], picks: ReturnPick[]): number {
  return picks.reduce((sum, p) => {
    const line = lines.find((l) => l.lineId === p.lineId);
    return line ? sum + returnOre(line, p.quantity) : sum;
  }, 0);
}

export const isFullyReturned = (sale: Pick<SaleSummary, 'totalOre' | 'refundedOre'>) =>
  sale.refundedOre > 0 && sale.refundedOre >= sale.totalOre;
