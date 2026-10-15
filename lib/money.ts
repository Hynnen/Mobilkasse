/**
 * WooCommerce gir priser som strenger («369», «369.5», «369.50»).
 * Vi regner alltid i øre (heltall) for å unngå flyttallsfeil.
 * Returnerer null for tom eller ugyldig pris (= ikke salgbart).
 */
export function toOre(price: string | null | undefined): number | null {
  const s = (price ?? '').trim().replace(',', '.');
  const m = /^(\d+)(?:\.(\d+))?$/.exec(s);
  if (!m) return null;
  // Tre første desimaler som heltall, avrundet til øre: «1.999» → 200 øre.
  const thousandths = Number((m[2] ?? '').padEnd(3, '0').slice(0, 3));
  return Number(m[1]) * 100 + Math.round(thousandths / 10);
}

const whole = new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK', maximumFractionDigits: 0 });
const withOre = new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK', minimumFractionDigits: 2 });

/** 36900 → «369 kr», 36950 → «369,50 kr» */
export function formatKr(ore: number): string {
  return (ore % 100 === 0 ? whole : withOre).format(ore / 100);
}

/** 29950 → «299.50» (desimalformatet WooCommerce forventer) */
export const toDecimal = (ore: number): string => (ore / 100).toFixed(2);
