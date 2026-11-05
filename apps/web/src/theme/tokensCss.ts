import { concreto, toCssStylesheet } from '@financas/tokens';

/**
 * Ink steps for the month ruler (DESIGN.md, "A régua do mês"): darkest first, so the largest
 * expense reads first. Same steps as `docs/design/tokens.html`; primitives are not part of the
 * semantic theme, so they are exposed here as `--plane-N`.
 */
const PLANES = {
  light: [concreto[950], concreto[800], concreto[700], concreto[600], concreto[500], concreto[400]],
  dark: [concreto[50], concreto[200], concreto[300], concreto[400], concreto[500], concreto[600]],
} as const;

export const PLANE_COUNT = PLANES.light.length;

const planeBlock = (selector: string, steps: readonly string[], indent = '') =>
  `${indent}${selector} {\n${steps.map((hex, i) => `${indent}  --plane-${i + 1}: ${hex};`).join('\n')}\n${indent}}`;

/** Every CSS custom property the web app reads: tokens (both themes) plus the ruler planes. */
export function buildTokensCss(): string {
  return [
    toCssStylesheet(),
    planeBlock(':root', PLANES.light),
    `@media (prefers-color-scheme: dark) {\n${planeBlock(':root:not([data-theme="light"])', PLANES.dark, '  ')}\n}`,
    planeBlock(':root[data-theme="dark"]', PLANES.dark),
    '',
  ].join('\n');
}
