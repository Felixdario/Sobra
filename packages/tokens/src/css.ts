import { elevation, type ShadowToken } from './elevation';
import { breakpoints, layout, radii, space, touchTarget } from './layout';
import { cubicBezierCss, durations, easings } from './motion';
import { themes, type Theme, type ThemeColors } from './themes';
import { fontFamilies, fontWeights, numericFeatures, textStyles } from './typography';

const kebab = (value: string) => value.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** `0.5` → `0_5` (a dot is not valid in a custom property name without escaping). */
const keyName = (key: string) => key.replace('.', '_');

function colorEntries(colors: ThemeColors): [string, string][] {
  const out: [string, string][] = [];
  for (const [group, values] of Object.entries(colors)) {
    for (const [name, value] of Object.entries(values as Record<string, unknown>)) {
      if (Array.isArray(value)) {
        value.forEach((v: string, i) => out.push([`--color-${group}-${kebab(name)}-${i + 1}`, v]));
      } else {
        out.push([`--color-${group}-${kebab(name)}`, String(value)]);
      }
    }
  }
  return out;
}

export function shadowToCss(shadow: ShadowToken): string {
  if (shadow.opacity === 0) return 'none';
  const hex = shadow.color;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px ${shadow.spread}px rgb(${r} ${g} ${b} / ${shadow.opacity})`;
}

/** Variables that depend on the theme: colors and shadows. */
function themedEntries(theme: Theme): [string, string][] {
  const shadows = Object.entries(elevation[theme.mode]).map(([level, token]): [string, string] => [
    `--shadow-${level}`,
    shadowToCss(token),
  ]);
  return [['color-scheme', theme.mode], ...colorEntries(theme.colors), ...shadows];
}

/** Variables that are the same in both themes. */
function staticEntries(): [string, string][] {
  const px = (n: number) => (n === 0 ? '0' : `${n}px`);
  return [
    ['--font-sans', fontFamilies.web],
    ['--font-numeric', numericFeatures.css],
    ...Object.entries(fontWeights).map(([k, v]): [string, string] => [
      `--font-weight-${k}`,
      `${v}`,
    ]),
    ...Object.entries(textStyles).flatMap(([name, s]): [string, string][] => {
      const n = kebab(name);
      return [
        [`--text-${n}-size`, px(s.size)],
        [`--text-${n}-line`, px(s.lineHeight)],
        [`--text-${n}-tracking`, s.tracking === 0 ? '0' : `${s.tracking}em`],
        [`--text-${n}-weight`, `${fontWeights[s.weight]}`],
      ];
    }),
    ...Object.entries(space).map(([k, v]): [string, string] => [`--space-${keyName(k)}`, px(v)]),
    ...Object.entries(radii).map(([k, v]): [string, string] => [`--radius-${k}`, px(v)]),
    ...Object.entries(durations).map(([k, v]): [string, string] => [`--duration-${k}`, `${v}ms`]),
    ...Object.entries(easings).map(([k, v]): [string, string] => [
      `--ease-${k}`,
      cubicBezierCss(v),
    ]),
    ...Object.entries(breakpoints).map(([k, v]): [string, string] => [`--bp-${k}`, px(v)]),
    ...Object.entries(layout).map(([k, v]): [string, string] => [`--layout-${kebab(k)}`, px(v)]),
    ['--touch-min', px(touchTarget.ios)],
    ['--touch-min-android', px(touchTarget.android)],
  ];
}

const block = (selector: string, entries: [string, string][], indent = '') =>
  `${indent}${selector} {\n${entries.map(([k, v]) => `${indent}  ${k}: ${v};`).join('\n')}\n${indent}}`;

/**
 * CSS custom properties for one theme, as a `:root` rule (or any selector). Includes the static
 * scales (type, space, radii, motion) so a single call is enough for a page with one theme.
 */
export function toCssVariables(theme: Theme, selector = ':root'): string {
  return `${block(selector, [...themedEntries(theme), ...staticEntries()])}\n`;
}

/**
 * Full stylesheet for an app with a theme switch: light by default, dark when the OS prefers it
 * (unless the page is pinned with `data-theme="light"`), and dark when pinned with
 * `data-theme="dark"`.
 */
export function toCssStylesheet(): string {
  const dark = themedEntries(themes.dark);
  return [
    block(':root', [...themedEntries(themes.light), ...staticEntries()]),
    `@media (prefers-color-scheme: dark) {\n${block(':root:not([data-theme="light"])', dark, '  ')}\n}`,
    block(':root[data-theme="dark"]', dark),
    '',
  ].join('\n');
}
