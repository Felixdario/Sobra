import { absCents, formatBRL, type Cents } from '@sobra/shared';

export const MINUS = '−';

export type SignMode = 'auto' | 'always' | 'never';

/**
 * BRL with the design's sign rule: "+R$ 6.800,00", "−R$ 412,37" (U+2212, never a hyphen), zero
 * unsigned. `never` drops the sign, for amounts whose direction the label already says.
 */
export function formatMoney(value: Cents, sign: SignMode = 'auto'): string {
  const body = formatBRL(absCents(value));
  if (sign === 'never' || value === 0) return body;
  if (value < 0) return `${MINUS}${body}`;
  return sign === 'always' ? `+${body}` : body;
}

const integer = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

/** Screen reader text: "menos 412 reais e 37 centavos", "1 real", "50 centavos". */
export function speakMoney(value: Cents): string {
  const abs = Math.abs(value);
  const reais = Math.floor(abs / 100);
  const centavos = abs % 100;
  const parts: string[] = [];
  if (reais > 0 || centavos === 0)
    parts.push(`${integer.format(reais)} ${reais === 1 ? 'real' : 'reais'}`);
  if (centavos > 0) parts.push(`${centavos} ${centavos === 1 ? 'centavo' : 'centavos'}`);
  return `${value < 0 ? 'menos ' : ''}${parts.join(' e ')}`;
}

const percent = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** Contract percentages are on the 0–100 scale (ADR-019): 15 → "15,0%". */
export function formatPercent(value: number): string {
  return `${percent.format(value)}%`;
}
