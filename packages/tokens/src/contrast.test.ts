import { describe, expect, it } from 'vitest';
import { contrastRatio } from './color';
import { themes, type ThemeColors, type ThemeMode } from './themes';

const AA = 4.5;
const AAA = 7;
const NON_TEXT = 3;

type Pair = { fg: string; bg: string; min: number; what: string };

/**
 * Every text/background pairing the interface is allowed to use, with its minimum. A new pairing
 * in the UI must be added here first.
 */
function pairs(c: ThemeColors): Pair[] {
  const grounds = {
    canvas: c.bg.canvas,
    surface: c.bg.surface,
    sunken: c.bg.sunken,
    raised: c.bg.raised,
  };
  const out: Pair[] = [];
  for (const [groundName, bg] of Object.entries(grounds)) {
    // Main numbers (balances, month totals, transaction amounts): AAA.
    out.push({ fg: c.text.primary, bg, min: AAA, what: `text.primary on ${groundName}` });
    out.push({ fg: c.money.expense, bg, min: AAA, what: `money.expense on ${groundName}` });
    out.push({ fg: c.money.income, bg, min: AAA, what: `money.income on ${groundName}` });
    out.push({ fg: c.money.debt, bg, min: AAA, what: `money.debt on ${groundName}` });
    // Secondary text: AA.
    for (const name of ['secondary', 'tertiary', 'link'] as const) {
      out.push({ fg: c.text[name], bg, min: AA, what: `text.${name} on ${groundName}` });
    }
    out.push({ fg: c.money.transfer, bg, min: AA, what: `money.transfer on ${groundName}` });
    out.push({ fg: c.money.zero, bg, min: AA, what: `money.zero on ${groundName}` });
    for (const name of ['success', 'warning', 'danger', 'info'] as const) {
      out.push({ fg: c.status[name], bg, min: AA, what: `status.${name} on ${groundName}` });
    }
    // Non-text UI that must be perceivable: input outlines, focus ring.
    out.push({ fg: c.border.strong, bg, min: NON_TEXT, what: `border.strong on ${groundName}` });
    out.push({ fg: c.border.focus, bg, min: NON_TEXT, what: `border.focus on ${groundName}` });
  }
  out.push(
    { fg: c.action.onPrimary, bg: c.action.primary, min: AAA, what: 'onPrimary on primary' },
    { fg: c.action.onPrimary, bg: c.action.primaryHover, min: AA, what: 'onPrimary on hover' },
    { fg: c.action.onPrimary, bg: c.action.primaryPressed, min: AA, what: 'onPrimary on pressed' },
    { fg: c.action.onSecondary, bg: c.action.secondary, min: AA, what: 'onSecondary' },
    { fg: c.action.onSecondary, bg: c.action.secondaryHover, min: AA, what: 'onSecondary hover' },
    { fg: c.action.onDestructive, bg: c.action.destructive, min: AA, what: 'onDestructive' },
    { fg: c.text.inverse, bg: c.bg.inverse, min: AAA, what: 'text.inverse on bg.inverse' },
    { fg: c.text.primary, bg: c.bg.selection, min: AAA, what: 'text.primary on selection' },
    { fg: c.status.success, bg: c.status.successSurface, min: AA, what: 'success on its surface' },
    { fg: c.status.warning, bg: c.status.warningSurface, min: AA, what: 'warning on its surface' },
    { fg: c.status.danger, bg: c.status.dangerSurface, min: AA, what: 'danger on its surface' },
    { fg: c.status.info, bg: c.status.infoSurface, min: AA, what: 'info on its surface' },
    { fg: c.text.primary, bg: c.status.warningSurface, min: AA, what: 'primary on warning bg' },
    { fg: c.text.primary, bg: c.status.dangerSurface, min: AA, what: 'primary on danger bg' },
    // Chart labels sit on the surface.
    { fg: c.chart.axis, bg: c.bg.surface, min: AA, what: 'chart.axis on surface' },
    // Graphical objects (WCAG 1.4.11): bars, lines and budget fills against the surface.
    { fg: c.chart.main, bg: c.bg.surface, min: NON_TEXT, what: 'chart.main' },
    { fg: c.chart.comparison, bg: c.bg.surface, min: NON_TEXT, what: 'chart.comparison' },
    { fg: c.chart.income, bg: c.bg.surface, min: NON_TEXT, what: 'chart.income' },
    { fg: c.chart.expense, bg: c.bg.surface, min: NON_TEXT, what: 'chart.expense' },
    { fg: c.chart.other, bg: c.bg.surface, min: NON_TEXT, what: 'chart.other' },
    { fg: c.budget.ok, bg: c.bg.surface, min: NON_TEXT, what: 'budget.ok' },
    { fg: c.budget.near, bg: c.bg.surface, min: NON_TEXT, what: 'budget.near' },
    { fg: c.budget.over, bg: c.bg.surface, min: NON_TEXT, what: 'budget.over' },
    ...c.chart.series.map((fg, i) => ({
      fg,
      bg: c.bg.surface,
      min: NON_TEXT,
      what: `chart.series[${i + 1}]`,
    })),
  );
  return out;
}

describe.each(['light', 'dark'] as ThemeMode[])('contraste — tema %s', (mode) => {
  const list = pairs(themes[mode].colors);

  it.each(list.map((p) => [p.what, p] as const))('%s', (_what, p) => {
    const ratio = contrastRatio(p.fg, p.bg);
    expect(
      ratio,
      `${p.what}: ${p.fg} sobre ${p.bg} = ${ratio.toFixed(2)}:1 (mín. ${p.min}:1)`,
    ).toBeGreaterThanOrEqual(p.min);
  });

  it('o preenchimento de orçamento se distingue do trilho (3:1)', () => {
    const c = themes[mode].colors;
    for (const fill of [c.budget.ok, c.budget.near, c.budget.over]) {
      expect(contrastRatio(fill, c.budget.track)).toBeGreaterThanOrEqual(NON_TEXT);
    }
  });
});
