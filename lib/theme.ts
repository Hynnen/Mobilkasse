/**
 * Butikkens temafarge kan være hva som helst. Tekst på handlingsfargen velges
 * automatisk (mørk eller hvit) etter hvilken som gir best kontrast.
 */

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const DARK_INK = '#24170e';
const LIGHT_INK = '#ffffff';

export function themeVars(themeColor: string): Record<string, string> {
  const ink = contrast(themeColor, DARK_INK) >= contrast(themeColor, LIGHT_INK) ? DARK_INK : LIGHT_INK;
  return { '--action': themeColor, '--action-ink': ink };
}
