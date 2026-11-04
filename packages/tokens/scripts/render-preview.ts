/**
 * Renders `docs/design/tokens.html`: a static, self-contained reference page generated from the
 * tokens, so the visual decisions can be checked in a browser in both themes. The figures are the
 * demo user's (synthetic) and are computed here so every total adds up.
 */
import {
  contrastRatio,
  concreto,
  darkTheme,
  deltaEOK,
  durations,
  easings,
  elevation,
  fontFamilies,
  lightTheme,
  radii,
  shadowToCss,
  simulateCvd,
  space,
  springs,
  textStyles,
  toCssVariables,
  type CvdKind,
  type Theme,
} from '../src/index';

// ---------------------------------------------------------------- formatting (pt-BR, BRL)

const MINUS = '−';
const NBSP = ' ';
const number2 = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const number1 = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** Cents → "R$ 1.081,55"; with `signed`, prefixes "+" or "−" (U+2212). */
function brl(cents: number, signed = false): string {
  const body = `R$${NBSP}${number2.format(Math.abs(cents) / 100)}`;
  if (!signed || cents === 0) return cents < 0 ? `${MINUS}${body}` : body;
  return `${cents > 0 ? '+' : MINUS}${body}`;
}
const pct = (value: number) => `${number1.format(value * 100)}%`;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function assertEqual(actual: number, expected: number, what: string): void {
  if (actual !== expected)
    throw new Error(`Dados do preview não fecham: ${what} (${actual} ≠ ${expected})`);
}

// ---------------------------------------------------------------- data (demo, synthetic)

const october = {
  income: 721_240,
  categories: [
    { name: 'Moradia', cents: 270_000 },
    { name: 'Mercado', cents: 108_640 },
    { name: 'Transporte', cents: 51_230 },
    { name: 'Restaurantes', cents: 46_875 },
    { name: 'Assinaturas', cents: 20_460 },
    { name: 'Outras', cents: 115_880 },
  ],
};
const septemberIncome = 683_620;
const septemberExpense = 627_410;
const octoberExpense = october.categories.reduce((sum, c) => sum + c.cents, 0);
assertEqual(octoberExpense, 613_085, 'despesas de outubro');
const octoberLeft = october.income - octoberExpense;
const septemberLeft = septemberIncome - septemberExpense;
assertEqual(octoberLeft, 108_155, 'sobra de outubro');
assertEqual(septemberLeft, 56_210, 'sobra de setembro');
const octoberRate = octoberLeft / october.income;
const septemberRate = septemberLeft / septemberIncome;

const budgets = [
  { name: 'Mercado', budget: 120_000, spent: 74_410 },
  { name: 'Restaurantes', budget: 50_000, spent: 46_130 },
  { name: 'Lazer', budget: 30_000, spent: 33_690 },
];

/** Balance per account over six months, in cents (end of month). */
const months = ['jun', 'jul', 'ago', 'set', 'out', 'nov'];
const accounts = [
  { name: 'Poupança Caixa', values: [800_000, 844_000, 892_400, 945_300, 1_001_200, 1_006_700] },
  { name: 'Nubank', values: [250_000, 232_100, 268_900, 241_700, 286_400, 274_300] },
  { name: 'Carteira', values: [20_000, 14_500, 18_200, 9_800, 16_300, 12_900] },
  { name: 'Cartão Inter', values: [0, -98_400, -121_300, -87_600, -128_490, -64_250] },
];

// ---------------------------------------------------------------- icons (Lucide, ISC license)

const icon = (paths: string, label?: string) =>
  `<svg class="icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" ${
    label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'
  }>${paths}</svg>`;
const icons = {
  briefcase:
    '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/>',
  cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
  transfer:
    '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>',
  card: '<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>',
  alert:
    '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
};

// ---------------------------------------------------------------- sections rendered per theme

function swatches(theme: Theme): string {
  const c = theme.colors;
  const rows: [string, string, string][] = [
    ['bg.canvas', c.bg.canvas, c.text.primary],
    ['bg.surface', c.bg.surface, c.text.primary],
    ['bg.sunken', c.bg.sunken, c.text.primary],
    ['bg.raised', c.bg.raised, c.text.primary],
    ['text.primary', c.text.primary, c.bg.surface],
    ['text.secondary', c.text.secondary, c.bg.surface],
    ['text.tertiary', c.text.tertiary, c.bg.surface],
    ['text.link', c.text.link, c.bg.surface],
    ['money.income', c.money.income, c.bg.surface],
    ['money.debt', c.money.debt, c.bg.surface],
    ['status.warning', c.status.warning, c.bg.surface],
    ['border.strong', c.border.strong, c.bg.surface],
    ['action.primary', c.action.primary, c.action.onPrimary],
    ['budget.near', c.budget.near, c.bg.surface],
  ];
  const items = rows
    .map(([name, color, against]) => {
      const isGround = name.startsWith('bg.') || name === 'action.primary';
      const ratio = isGround ? contrastRatio(against, color) : contrastRatio(color, against);
      const what = isGround ? 'texto sobre ela' : 'sobre surface';
      return `<li class="swatch"><span class="chip" style="background:${color}"></span><span class="swatch-name">${name}</span><span class="swatch-hex num">${color}</span><span class="swatch-ratio num">${number2.format(ratio)}:1 <span class="muted">${what}</span></span></li>`;
    })
    .join('');
  return `<ul class="swatches">${items}</ul>`;
}

function dataPalette(theme: Theme): string {
  const series = theme.colors.chart.series;
  const names = ['Cobalto', 'Ocre', 'Céu', 'Rosa', 'Oliva'];
  const kinds: (CvdKind | undefined)[] = [undefined, 'deutan', 'protan'];
  const kindLabel = (k: CvdKind | undefined) =>
    k === 'deutan' ? 'Deuteranopia' : k === 'protan' ? 'Protanopia' : 'Visão típica';
  const toHex = (rgb: readonly number[]) =>
    `#${rgb
      .map((v) => Math.round((v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055) * 255))
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()}`;
  const strips = kinds
    .map((k) => {
      const cells = series
        .map((hex) => `<span style="background:${k ? toHex(simulateCvd(hex, k)) : hex}"></span>`)
        .join('');
      return `<div class="strip-row"><span class="strip-label">${kindLabel(k)}</span><div class="strip">${cells}</div></div>`;
    })
    .join('');
  const legend = series
    .map((hex, i) => {
      const next = series[i + 1];
      const gap = next
        ? `ΔE ${number1.format(Math.min(deltaEOK(hex, next, 'protan'), deltaEOK(hex, next, 'deutan')))} com daltonismo · ${number1.format(deltaEOK(hex, next))} típica`
        : '';
      return `<li><span class="chip small" style="background:${hex}"></span>${i + 1}. ${names[i]} <span class="num muted">${hex}</span><span class="muted delta">${gap}</span></li>`;
    })
    .join('');
  return `<div class="strips">${strips}</div><ol class="series-legend">${legend}</ol>${lineChart(theme)}`;
}

function lineChart(theme: Theme): string {
  const c = theme.colors.chart;
  const w = 520;
  const h = 200;
  const pad = { l: 64, r: 120, t: 12, b: 28 };
  const all = accounts.flatMap((a) => a.values);
  const max = 1_100_000;
  const min = -200_000;
  if (Math.max(...all) > max || Math.min(...all) < min) throw new Error('Escala do gráfico');
  const x = (i: number) => pad.l + (i * (w - pad.l - pad.r)) / (months.length - 1);
  const y = (v: number) => pad.t + ((max - v) * (h - pad.t - pad.b)) / (max - min);
  const ticks = [-200_000, 200_000, 600_000, 1_000_000];
  const grid = ticks
    .map(
      (t) =>
        `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y(t)}" y2="${y(t)}" stroke="${t === 0 ? c.axis : c.grid}" stroke-width="1"/><text x="${pad.l - 8}" y="${y(t) + 4}" text-anchor="end" class="axis">${t < 0 ? MINUS : ''}${Math.abs(t) / 100_000} mil</text>`,
    )
    .join('');
  const zero = `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y(0)}" y2="${y(0)}" stroke="${c.axis}" stroke-width="1"/>`;
  const xs = months
    .map((m, i) => `<text x="${x(i)}" y="${h - 8}" text-anchor="middle" class="axis">${m}</text>`)
    .join('');
  // Direct labels at the line ends, pushed apart so none collide (13px apart at least).
  const labelY = accounts
    .map((a, i) => ({ i, y: y(a.values[a.values.length - 1] ?? 0) + 4 }))
    .sort((p, q) => p.y - q.y);
  labelY.forEach((p, k) => {
    const prev = labelY[k - 1];
    if (prev && p.y - prev.y < 13) p.y = prev.y + 13;
  });
  const labelAt = (i: number) => labelY.find((p) => p.i === i)?.y ?? 0;
  const lines = accounts
    .map((a, i) => {
      const color = c.series[i] ?? c.other;
      const pts = a.values.map((v, j) => `${x(j)},${y(v)}`).join(' ');
      const last = a.values[a.values.length - 1] ?? 0;
      return `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/><circle cx="${x(months.length - 1)}" cy="${y(last)}" r="4" fill="${color}" stroke="${theme.colors.bg.surface}" stroke-width="2"/><text x="${x(months.length - 1) + 10}" y="${labelAt(i)}" class="direct">${a.name}</text>`;
    })
    .join('');
  return `<figure class="chart"><figcaption>Saldo por conta, fim de cada mês</figcaption><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Linhas do saldo de quatro contas de junho a novembro">${grid}${zero}${xs}${lines}</svg></figure>`;
}

function kpi(theme: Theme): string {
  const deltaLeft = octoberLeft - septemberLeft;
  const deltaRatePp = (octoberRate - septemberRate) * 100;
  const deltaExpense = octoberExpense - septemberExpense;
  const left = october.categories;
  let offset = 0;
  const planes = left
    .map((cat, i) => {
      const width = (cat.cents / october.income) * 100;
      const start = offset;
      offset += width;
      const tone = [
        'var(--plane-1)',
        'var(--plane-2)',
        'var(--plane-3)',
        'var(--plane-4)',
        'var(--plane-5)',
        'var(--plane-6)',
      ][i];
      return `<span class="plane" style="left:${start.toFixed(3)}%;width:${width.toFixed(3)}%;background:${tone}" title="${cat.name}: ${brl(cat.cents)}"></span>`;
    })
    .join('');
  const leftWidth = (octoberLeft / october.income) * 100;
  const sobra = `<span class="plane plane-sobra" style="left:${offset.toFixed(3)}%;width:${leftWidth.toFixed(3)}%"></span>`;
  const legend = left
    .map(
      (cat, i) =>
        `<li><span class="chip small" style="background:var(--plane-${i + 1})"></span>${cat.name}<span class="num">${brl(cat.cents)}</span></li>`,
    )
    .join('');
  void theme;
  return `
<section class="card kpi" aria-label="Resumo de outubro">
  <header class="card-head"><h3>Outubro de 2026</h3><span class="muted">mês fechado</span></header>
  <p class="figure-xl num">${brl(octoberLeft)}</p>
  <p class="kpi-line">sobraram de ${brl(october.income)} recebidos · taxa de poupança <strong class="num">${pct(octoberRate)}</strong></p>
  <p class="delta good"><svg class="tri" viewBox="0 0 10 10" aria-hidden="true"><path d="M5 1 9 9H1z"/></svg><span class="num">${brl(deltaLeft, true)}</span> a mais que em setembro <span class="muted num">(${brl(septemberLeft)} · ${pct(septemberRate)}, ${deltaRatePp > 0 ? '+' : MINUS}${number1.format(Math.abs(deltaRatePp))} p.p.)</span></p>
  <div class="regua" role="img" aria-label="Receitas de outubro divididas em despesas por categoria e a sobra">${planes}${sobra}</div>
  <div class="regua-scale"><span>${brl(0)}</span><span class="sobra-label">Sobra ${brl(octoberLeft)}</span><span class="num">${brl(october.income)}</span></div>
  <ul class="planes-legend">${legend}</ul>
  <dl class="kpi-pair">
    <div><dt>Despesas</dt><dd class="num">${brl(octoberExpense)}</dd><dd class="delta good small"><svg class="tri down" viewBox="0 0 10 10" aria-hidden="true"><path d="M5 1 9 9H1z"/></svg><span class="num">${brl(deltaExpense, true)}</span> vs setembro</dd></div>
    <div><dt>Receitas</dt><dd class="num">${brl(october.income)}</dd><dd class="delta neutral small"><span class="num">${brl(october.income - septemberIncome, true)}</span> vs setembro</dd></div>
  </dl>
</section>`;
}

function transactions(): string {
  const rows = [
    {
      icon: icons.briefcase,
      swatch: '#16A34A',
      title: 'Salário',
      meta: 'Salário · Nubank · 07 out',
      amount: 680_000,
      kind: 'income',
    },
    {
      icon: icons.cart,
      swatch: '#F97316',
      title: 'Pão de Açúcar',
      meta: 'Mercado · Cartão Inter · 18 out',
      amount: -41_237,
      kind: 'expense',
    },
    {
      icon: icons.transfer,
      swatch: '',
      title: 'Nubank → Poupança Caixa',
      meta: 'Transferência · 08 out',
      amount: 50_000,
      kind: 'transfer',
    },
  ];
  const items = rows
    .map((r) => {
      const amount =
        r.kind === 'transfer'
          ? `<span class="amount transfer num">${brl(r.amount)}</span>`
          : `<span class="amount ${r.kind} num">${brl(r.amount, true)}</span>`;
      const marker = r.swatch
        ? `<span class="cat-square" style="background:${r.swatch}"></span>`
        : '<span class="cat-square neutral"></span>';
      return `<li class="tx"><span class="tx-icon">${marker}${icon(r.icon)}</span><span class="tx-text"><span class="tx-title">${esc(r.title)}</span><span class="tx-meta">${esc(r.meta)}</span></span>${amount}</li>`;
    })
    .join('');
  const debt = `<li class="tx"><span class="tx-icon"><span class="cat-square" style="background:#FF7A00"></span>${icon(icons.card)}</span><span class="tx-text"><span class="tx-title">Cartão Inter</span><span class="tx-meta">Fatura aberta · fecha em 12 nov</span></span><span class="amount debt num">${brl(-128_490)}</span></li>`;
  return `<section class="card" aria-label="Transações"><header class="card-head"><h3>Outubro</h3><span class="muted">3 de 41 lançamentos</span></header><ul class="tx-list">${items}</ul><header class="card-head sub"><h3>Contas</h3></header><ul class="tx-list">${debt}</ul></section>`;
}

function budgetBars(): string {
  const items = budgets
    .map((b) => {
      const ratio = b.spent / b.budget;
      const over = b.spent > b.budget;
      const scale = Math.max(b.spent, b.budget);
      const okWidth = (Math.min(b.spent, b.budget) / scale) * 100;
      const overWidth = over ? ((b.spent - b.budget) / scale) * 100 : 0;
      const state = over ? 'over' : ratio >= 0.85 ? 'near' : 'ok';
      const marker = over
        ? `<span class="budget-mark" style="left:${okWidth.toFixed(3)}%"></span>`
        : '';
      const status =
        state === 'over'
          ? `<span class="status danger">${icon(icons.alert)}<span class="num">${brl(b.spent - b.budget)}</span> acima</span>`
          : state === 'near'
            ? `<span class="status warning">${icon(icons.alert)}Perto do limite · restam <span class="num">${brl(b.budget - b.spent)}</span></span>`
            : `<span class="status ok">${icon(icons.check)}Restam <span class="num">${brl(b.budget - b.spent)}</span></span>`;
      return `<li class="budget ${state}">
  <div class="budget-head"><span class="budget-name">${b.name}</span><span class="num budget-values"><strong>${brl(b.spent)}</strong> de ${brl(b.budget)}</span></div>
  <div class="budget-track" role="progressbar" aria-label="${b.name}" aria-valuemin="0" aria-valuemax="${b.budget / 100}" aria-valuenow="${b.spent / 100}" aria-valuetext="${brl(b.spent)} de ${brl(b.budget)} (${Math.round(ratio * 100)}%)"><span class="budget-fill" style="width:${okWidth.toFixed(3)}%"></span>${over ? `<span class="budget-over" style="left:${okWidth.toFixed(3)}%;width:${overWidth.toFixed(3)}%"></span>` : ''}${marker}</div>
  ${status}
</li>`;
    })
    .join('');
  return `<section class="card" aria-label="Orçamentos"><header class="card-head"><h3>Orçamentos de novembro</h3><span class="muted">dia 4 de 30</span></header><ul class="budgets">${items}</ul></section>`;
}

function pane(theme: Theme): string {
  const name = theme.mode === 'light' ? 'Claro' : 'Escuro';
  return `<div class="pane theme-${theme.mode}"><h3 class="pane-title">${name}</h3>`;
}

// ---------------------------------------------------------------- theme-independent sections

function typeSpecimen(): string {
  const samples: Record<string, string> = {
    figureXl: brl(108_155),
    figureLg: brl(1_006_700),
    figureMd: brl(-128_490),
    headline: 'Para onde foi o dinheiro',
    title: 'Orçamentos de novembro',
    titleSm: 'Cartão Inter',
    body: 'Lance um gasto em três toques: valor, categoria, salvar.',
    bodySm: 'Transferências não entram em receitas nem em despesas.',
    label: 'Categoria',
    caption: 'Atualizado às 14:32 · dados de demonstração',
  };
  const rows = Object.entries(textStyles)
    .map(([name, s]) => {
      const style = `font-size:${s.size}px;line-height:${s.lineHeight}px;letter-spacing:${s.tracking}em;font-weight:var(--font-weight-${s.weight})`;
      return `<tr><td class="spec-name">${name}<br><span class="muted num">${s.size}/${s.lineHeight} · ${s.weight} · ${s.tracking}em</span></td><td><span class="${s.numeric ? 'num' : ''}" style="${style}">${esc(samples[name] ?? name)}</span></td></tr>`;
    })
    .join('');
  return `<table class="spec">${rows}</table>
<p class="tabular-demo num" aria-label="Algarismos tabulares alinhados">
  <span>${brl(111_111)}</span><span>${brl(888_888)}</span><span>${brl(-1_010)}</span>
</p>`;
}

function spacingScale(): string {
  const items = Object.entries(space)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => a - b)
    .map(
      ([k, v]) =>
        `<li><span class="num space-key">${k}</span><span class="space-bar" style="width:${v}px"></span><span class="num muted">${v}px</span></li>`,
    )
    .join('');
  const rad = Object.entries(radii)
    .filter(([k]) => k !== 'none')
    .map(
      ([k, v]) =>
        `<li><span class="radius-box" style="border-radius:${Math.min(v, 28)}px"></span>${k}<span class="num muted">${v === 9999 ? 'pílula' : `${v}px`}</span></li>`,
    )
    .join('');
  return `<div class="two"><div><h3>Espaçamento (grade de 4px)</h3><ul class="spaces">${items}</ul></div><div><h3>Raios</h3><ul class="radii">${rad}</ul></div></div>`;
}

function motionTable(): string {
  const d = Object.entries(durations)
    .map(([k, v]) => `<tr><td>${k}</td><td class="num">${v} ms</td></tr>`)
    .join('');
  const e = Object.entries(easings)
    .map(([k, v]) => `<tr><td>${k}</td><td class="num">cubic-bezier(${v.join(', ')})</td></tr>`)
    .join('');
  const s = Object.entries(springs)
    .map(
      ([k, v]) =>
        `<tr><td>${k}</td><td class="num">damping ${v.damping} · stiffness ${v.stiffness} · mass ${v.mass}</td></tr>`,
    )
    .join('');
  const sh = (['raised', 'overlay'] as const)
    .map(
      (k) =>
        `<li class="shadow-demo" data-ui style="box-shadow:${shadowToCss(elevation.light[k])}">${k}<span class="muted">${k === 'raised' ? 'menus, popovers, linha arrastada' : 'diálogos e folhas'}</span></li>`,
    )
    .join('');
  return `<div class="two"><div><h3>Movimento</h3><table class="spec small">${d}${e}${s}</table></div><div><h3>Elevação</h3><p class="muted">Superfícies em repouso são planas. Só o que flutua tem sombra.</p><ul class="shadows" data-ui>${sh}</ul></div></div>`;
}

// ---------------------------------------------------------------- page

/** Ink steps for the month ruler planes: darkest first, so the biggest expense reads first. */
function planeVars(mode: 'light' | 'dark'): string {
  const steps =
    mode === 'light'
      ? [concreto[950], concreto[800], concreto[700], concreto[600], concreto[500], concreto[400]]
      : [concreto[50], concreto[200], concreto[300], concreto[400], concreto[500], concreto[600]];
  return steps.map((hex, i) => `--plane-${i + 1}:${hex}`).join(';');
}

const pageCss = `
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;font-family:var(--font-sans);font-size:var(--text-body-size);line-height:var(--text-body-line);background:var(--color-bg-canvas);color:var(--color-text-primary);font-kerning:normal}
::selection{background:var(--color-bg-selection);color:var(--color-text-primary)}
:focus-visible{outline:2px solid var(--color-border-focus);outline-offset:2px}
.num{font-variant-numeric:tabular-nums lining-nums;font-feature-settings:var(--font-numeric)}
.muted{color:var(--color-text-tertiary)}
.page{max-width:1280px;margin:0 auto;padding:var(--space-10) var(--space-4) var(--space-20)}
.page>header h1{font-size:var(--text-figure-md-size);line-height:var(--text-figure-md-line);letter-spacing:var(--text-figure-md-tracking);font-weight:600;margin:0 0 var(--space-2)}
.page>header p{margin:0;max-width:68ch;color:var(--color-text-secondary)}
.intro{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-10);align-items:start}
@media (max-width:900px){.intro{grid-template-columns:1fr}}
.decisions{margin:0;display:grid;gap:var(--space-2)}
.decisions div{display:grid;grid-template-columns:120px 1fr;gap:var(--space-3);padding-top:var(--space-2);border-top:1px solid var(--color-border-subtle)}
.decisions dt{font-weight:500}
.decisions dd{margin:0;color:var(--color-text-secondary)}
.page>section{margin-top:var(--space-16)}
h2{font-size:var(--text-headline-size);line-height:var(--text-headline-line);letter-spacing:var(--text-headline-tracking);font-weight:600;margin:0 0 var(--space-2)}
h2+p{margin:0 0 var(--space-6);max-width:68ch;color:var(--color-text-secondary)}
h3{font-size:var(--text-title-sm-size);line-height:var(--text-title-sm-line);font-weight:600;margin:0}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4);align-items:start}
@media (max-width:900px){.pair{grid-template-columns:1fr}}
.pane{background:var(--color-bg-canvas);color:var(--color-text-primary);border-radius:var(--radius-lg);padding:var(--space-6) var(--space-4);display:flex;flex-direction:column;gap:var(--space-4);min-width:0}
.theme-light{outline:1px solid var(--color-border-subtle)}
.pane-title{font-size:var(--text-label-size);font-weight:500;color:var(--color-text-tertiary)}
.card{background:var(--color-bg-surface);border:1px solid var(--color-border-subtle);border-radius:var(--radius-lg);padding:var(--space-4)}
.card-head{display:flex;justify-content:space-between;align-items:baseline;gap:var(--space-3);margin-bottom:var(--space-3)}
.card-head.sub{margin-top:var(--space-6)}
.card-head .muted{font-size:var(--text-body-sm-size)}
.swatches{list-style:none;margin:0;padding:0;display:grid;gap:var(--space-1)}
.swatch{display:grid;grid-template-columns:28px 1fr auto;grid-template-areas:"chip name hex" "chip ratio ratio";column-gap:var(--space-3);align-items:center;padding:var(--space-1) 0}
.swatch .chip{grid-area:chip;width:28px;height:28px;border-radius:var(--radius-sm);outline:1px solid var(--color-border-subtle)}
.swatch-name{grid-area:name;font-size:var(--text-body-sm-size)}
.swatch-hex{grid-area:hex;font-size:var(--text-caption-size);color:var(--color-text-secondary)}
.swatch-ratio{grid-area:ratio;font-size:var(--text-caption-size)}
.chip.small{display:inline-block;width:10px;height:10px;border-radius:var(--radius-xs);margin-right:var(--space-2);vertical-align:baseline}
.strips{display:grid;gap:var(--space-2)}
.strip-row{display:grid;grid-template-columns:104px 1fr;align-items:center;gap:var(--space-3);font-size:var(--text-caption-size);color:var(--color-text-secondary)}
.strip{display:flex;gap:2px;height:28px}
.strip span{flex:1;border-radius:var(--radius-xs)}
.series-legend{margin:var(--space-4) 0 0;padding:0;list-style:none;display:grid;gap:var(--space-1);font-size:var(--text-body-sm-size)}
.series-legend .delta{display:block;margin-left:18px;font-size:var(--text-caption-size)}
.chart{margin:var(--space-6) 0 0}
.chart figcaption{font-size:var(--text-body-sm-size);font-weight:500;margin-bottom:var(--space-2)}
.chart svg{width:100%;height:auto;display:block}
.chart .axis{font-size:11px;fill:var(--color-chart-axis);font-variant-numeric:tabular-nums}
.chart .direct{font-size:12px;fill:var(--color-text-secondary)}
.kpi .figure-xl{font-size:var(--text-figure-xl-size);line-height:var(--text-figure-xl-line);letter-spacing:var(--text-figure-xl-tracking);font-weight:600;margin:0}
.kpi-line{margin:var(--space-1) 0 0;color:var(--color-text-secondary)}
.kpi-line strong{color:var(--color-text-primary);font-weight:600}
.delta{display:flex;align-items:center;gap:var(--space-1);flex-wrap:wrap;margin:var(--space-2) 0 0;font-size:var(--text-body-sm-size)}
.delta.small{margin:0;font-size:var(--text-caption-size)}
.delta.good>.num{color:var(--color-money-income);font-weight:600}
.delta.neutral>.num{color:var(--color-text-secondary)}
.tri{width:10px;height:10px;fill:var(--color-money-income)}
.tri.down{transform:rotate(180deg)}
.regua{position:relative;height:32px;margin-top:var(--space-6);background:var(--color-bg-sunken);border-radius:var(--radius-xs);overflow:hidden}
.plane{position:absolute;top:0;bottom:0;border-right:2px solid var(--color-bg-surface)}
.plane-sobra{background:var(--color-chart-main);border-right:0}
.theme-light .kpi{${planeVars('light')}}
.theme-dark .kpi{${planeVars('dark')}}
.regua-scale{display:flex;justify-content:space-between;font-size:var(--text-caption-size);color:var(--color-text-tertiary);margin-top:var(--space-1)}
.sobra-label{color:var(--color-text-link);font-weight:600;margin-left:auto;margin-right:var(--space-3)}
.planes-legend{list-style:none;margin:var(--space-3) 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:var(--space-1) var(--space-4);font-size:var(--text-body-sm-size)}
.planes-legend li{display:flex;align-items:center}
.planes-legend .num{margin-left:auto;color:var(--color-text-secondary)}
.kpi-pair{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4);margin:var(--space-6) 0 0;padding-top:var(--space-4);border-top:1px solid var(--color-border-subtle)}
.kpi-pair dt{font-size:var(--text-label-size);font-weight:500;color:var(--color-text-secondary)}
.kpi-pair dd{margin:0}
.kpi-pair dd.num{font-size:var(--text-figure-md-size);line-height:var(--text-figure-md-line);letter-spacing:var(--text-figure-md-tracking);font-weight:600}
.tx-list{list-style:none;margin:0;padding:0}
.tx{display:flex;align-items:center;gap:var(--space-3);min-height:var(--layout-row-tall);padding:var(--space-2) 0;border-top:1px solid var(--color-border-subtle)}
.tx:first-child{border-top:0}
.tx-icon{position:relative;display:grid;place-items:center;width:40px;height:40px;color:var(--color-text-secondary);flex:none}
.cat-square{position:absolute;left:2px;top:2px;width:8px;height:8px;border-radius:1px}
.cat-square.neutral{background:var(--color-text-tertiary)}
.tx-text{display:flex;flex-direction:column;min-width:0;flex:1}
.tx-title{font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tx-meta{font-size:var(--text-body-sm-size);color:var(--color-text-tertiary)}
.amount{font-weight:600;text-align:right;white-space:nowrap}
.amount.income{color:var(--color-money-income)}
.amount.expense{color:var(--color-money-expense)}
.amount.transfer{color:var(--color-money-transfer);font-weight:500}
.amount.debt{color:var(--color-money-debt)}
.budgets{list-style:none;margin:0;padding:0;display:grid;gap:var(--space-5)}
.budget-head{display:flex;justify-content:space-between;gap:var(--space-3);margin-bottom:var(--space-2)}
.budget-name{font-weight:500}
.budget-values{color:var(--color-text-secondary);font-size:var(--text-body-sm-size)}
.budget-values strong{color:var(--color-text-primary);font-weight:600}
.budget-track{position:relative;height:10px;background:var(--color-budget-track);border-radius:var(--radius-sm);overflow:hidden}
.budget-fill{position:absolute;left:0;top:0;bottom:0;border-radius:var(--radius-sm) 0 0 var(--radius-sm);background:var(--color-budget-ok)}
.budget.near .budget-fill{background:var(--color-budget-near)}
.budget.over .budget-fill{background:var(--color-budget-ok)}
.budget-over{position:absolute;top:0;bottom:0;background-color:var(--color-budget-over);background-image:var(--hatch);border-left:2px solid var(--color-bg-surface)}
.theme-light .budget-over{--hatch:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='6' height='6'%3E%3Cpath d='M-1 7 7-1M-1 1 1-1M5 7 7 5' stroke='%23FFFFFF' stroke-opacity='.55' stroke-width='1.5'/%3E%3C/svg%3E")}
.theme-dark .budget-over{--hatch:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='6' height='6'%3E%3Cpath d='M-1 7 7-1M-1 1 1-1M5 7 7 5' stroke='%23141413' stroke-opacity='.55' stroke-width='1.5'/%3E%3C/svg%3E")}
.budget-mark{position:absolute;top:-3px;bottom:-3px;width:2px;margin-left:-1px;background:var(--color-text-primary)}
.status{display:flex;align-items:center;gap:var(--space-1);margin-top:var(--space-2);font-size:var(--text-body-sm-size)}
.status .icon{width:16px;height:16px;flex:none}
.status.ok{color:var(--color-text-secondary)}
.status.warning{color:var(--color-status-warning);font-weight:500}
.status.danger{color:var(--color-status-danger);font-weight:600}
.spec{border-collapse:collapse;width:100%}
.spec td{padding:var(--space-3) var(--space-4) var(--space-3) 0;border-top:1px solid var(--color-border-subtle);vertical-align:baseline}
.spec.small td{padding:var(--space-2) var(--space-4) var(--space-2) 0;font-size:var(--text-body-sm-size)}
.spec-name{width:200px;font-size:var(--text-body-sm-size);font-weight:500}
.spec-name .muted{font-weight:400;font-size:var(--text-caption-size)}
.tabular-demo{display:inline-grid;justify-items:end;gap:2px;margin:var(--space-6) 0 0;padding:var(--space-3) var(--space-4);background:var(--color-bg-surface);border:1px solid var(--color-border-subtle);border-radius:var(--radius-md);font-size:var(--text-title-size);font-weight:600}
.two{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-10)}
@media (max-width:760px){.two{grid-template-columns:1fr}}
.two h3{margin-bottom:var(--space-3)}
.two+.two{margin-top:var(--space-12)}
.spaces,.radii,.shadows{list-style:none;margin:0;padding:0;display:grid;gap:var(--space-2)}
.spaces li{display:grid;grid-template-columns:40px 1fr 56px;align-items:center;gap:var(--space-3);font-size:var(--text-body-sm-size)}
.space-bar{height:12px;background:var(--color-chart-main);border-radius:1px}
.radii{grid-template-columns:repeat(3,1fr)}
.radii li{display:flex;flex-direction:column;gap:var(--space-1);font-size:var(--text-body-sm-size)}
.radius-box{width:56px;height:56px;background:var(--color-bg-surface);border:2px solid var(--color-text-primary)}
.shadows{gap:var(--space-6);padding:var(--space-4) 0}
.shadow-demo{display:flex;flex-direction:column;padding:var(--space-4);background:var(--color-bg-surface);border-radius:var(--radius-lg);font-weight:500}
.shadow-demo .muted{font-weight:400;font-size:var(--text-body-sm-size)}
.page>footer{margin-top:var(--space-16);padding-top:var(--space-4);border-top:1px solid var(--color-border-subtle);font-size:var(--text-caption-size);color:var(--color-text-tertiary)}
@media (max-width:480px){.kpi .figure-xl{font-size:var(--text-figure-lg-size);line-height:var(--text-figure-lg-line)}.kpi-pair dd.num{font-size:var(--text-title-size);line-height:var(--text-title-line)}}
`;

function sectionPair(id: string, title: string, intro: string, body: (t: Theme) => string): string {
  return `<section id="${id}"><h2>${title}</h2><p>${intro}</p><div class="pair">${[
    lightTheme,
    darkTheme,
  ]
    .map((t) => `${pane(t)}${body(t)}</div>`)
    .join('')}</div></section>`;
}

export function renderPreviewHtml(): string {
  const css = [
    toCssVariables(lightTheme),
    toCssVariables(lightTheme, '.theme-light'),
    toCssVariables(darkTheme, '.theme-dark'),
    pageCss.trim(),
  ].join('\n');
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sobra — tokens</title>
<meta name="description" content="Referência visual dos tokens de design do Sobra, gerada de @financas/tokens.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${fontFamilies.webStylesheet}">
<style>
${css}
</style>
</head>
<body>
<!-- Gerado por packages/tokens/scripts/build-preview.ts. Não edite à mão: rode \`corepack pnpm --filter @financas/tokens build:preview\`. -->
<main class="page">
<header class="intro">
<div>
<h1>Sobra — tokens de design</h1>
<p>Referência gerada a partir de <code>@financas/tokens</code>. Os valores são do usuário de demonstração (sintéticos). Claro e escuro lado a lado; cada razão de contraste é calculada pela fórmula WCAG 2.</p>
</div>
<dl class="decisions">
<div><dt>Nome</dt><dd>Sobra: quanto sobra no fim do mês</dd></div>
<div><dt>Chão</dt><dd>Concreto: neutro quase sem croma, nunca creme</dd></div>
<div><dt>Matiz único</dt><dd>Cobalto, do azulejo de Athos Bulcão: dado principal, link, foco</dd></div>
<div><dt>Fonte</dt><dd>Archivo 400/500/600, algarismos tabulares</dd></div>
<div><dt>Assinatura</dt><dd>A régua do mês: a receita dividida em planos chapados de despesa, e a sobra</dd></div>
</dl>
</header>
<section id="tipografia"><h2>Tipografia</h2><p>Uma família, Archivo, em 400, 500 e 600. Escala fixa; três passos só para valores, sempre com algarismos tabulares.</p>${typeSpecimen()}</section>
${sectionPair('cores', 'Cores semânticas', 'Chão de concreto, tinta quase preta, um só matiz (cobalto) para o dado principal, links e foco. Verde só para entrada, vermelho só para dívida e estouro.', swatches)}
${sectionPair('dados', 'Paleta de dados', 'Cinco matizes em ordem fixa, validados para daltonismo (ΔE OKLab ×100, Machado 2009). A sexta série vira “Outras”.', dataPalette)}
${sectionPair('componentes', 'Esboços', 'Resumo do mês com a régua (assinatura), linhas de transação e orçamentos nos três estados.', (t) => `${kpi(t)}${transactions()}${budgetBars()}`)}
<section id="escala"><h2>Espaço, forma e movimento</h2><p>Escala de 4px, raios curtos e movimento que só comunica estado.</p>${spacingScale()}${motionTable()}</section>
<footer>Ícones: Lucide (ISC). Fonte: Archivo, Omnibus-Type (SIL Open Font License), via Google Fonts.</footer>
</main>
</body>
</html>
`;
}
