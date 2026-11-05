import { cents, formatBRL, type Cents } from '@financas/shared';

/** U+2212: DESIGN.md writes every negative value with the real minus sign, not a hyphen. */
export const MINUS = '−';

const toMinus = (text: string) => text.replace('-', MINUS);

/** "R$ 1.234,56" / "−R$ 85,90". */
export function money(value: number): string {
  return toMinus(formatBRL(cents(value)));
}

/** "+R$ 6.800,00" / "−R$ 412,37"; zero stays unsigned. */
export function signedMoney(value: number): string {
  return toMinus(formatBRL(cents(value), { signed: true }));
}

const compactFormatter = new Intl.NumberFormat('pt-BR', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** Axis labels: "2 mil", "12,5 mil", "1,2 mi" (reais, no currency symbol). */
export function compactReais(value: number): string {
  return toMinus(compactFormatter.format(value / 100));
}

const percentFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** API percentages are on the 0–100 scale: 15 → "15,0%". */
export function percent(value: number): string {
  return `${toMinus(percentFormatter.format(value))}%`;
}

/** Difference of two rates in percentage points: "+6,8 p.p.". */
export function percentagePoints(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const sign = rounded > 0 ? '+' : rounded < 0 ? MINUS : '';
  return `${sign}${percentFormatter.format(Math.abs(rounded))} p.p.`;
}

/** For screen readers: "menos 412 reais e 37 centavos". */
export function spokenMoney(value: Cents | number): string {
  const negative = value < 0;
  const abs = Math.abs(value);
  const reais = Math.floor(abs / 100);
  const centavos = abs % 100;
  const parts: string[] = [];
  if (reais > 0 || centavos === 0) parts.push(`${reais} ${reais === 1 ? 'real' : 'reais'}`);
  if (centavos > 0) parts.push(`${centavos} ${centavos === 1 ? 'centavo' : 'centavos'}`);
  return `${negative ? 'menos ' : ''}${parts.join(' e ')}`;
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
