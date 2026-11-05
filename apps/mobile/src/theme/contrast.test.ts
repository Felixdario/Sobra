import { contrastRatio, createNativeTheme, type ThemeMode } from '@financas/tokens';

/*
 * Every text/background and graphic/background pair the mobile screens draw, in both themes
 * (WCAG: text 4.5:1, large figures 3:1 but PRODUCT.md asks 7:1 for the main numbers, graphics
 * and control borders 3:1). Includes the keypad keys, the chips, the swipe actions and the
 * hatched over-budget/ruler segments.
 */
const TEXT = 4.5;
const MAIN_NUMBER = 7;
const GRAPHIC = 3;

describe.each<ThemeMode>(['light', 'dark'])('contraste no tema %s', (mode) => {
  const { colors: c } = createNativeTheme(mode);

  const textPairs: [string, string, string][] = [
    ['texto principal na superfície', c.text.primary, c.bg.surface],
    ['texto principal no chão', c.text.primary, c.bg.canvas],
    ['secundário na superfície', c.text.secondary, c.bg.surface],
    ['secundário no chão (cabeçalho de dia)', c.text.secondary, c.bg.canvas],
    ['terciário na superfície (detalhe da linha)', c.text.tertiary, c.bg.surface],
    ['terciário no campo (placeholder)', c.text.tertiary, c.bg.surface],
    ['dígito do teclado na tecla', c.text.primary, c.bg.sunken],
    ['tecla pressionada', c.text.primary, c.action.secondaryHover],
    ['chip', c.text.primary, c.bg.sunken],
    ['chip selecionado (link na seleção)', c.text.link, c.bg.selection],
    ['aba ativa', c.text.link, c.bg.surface],
    ['aba inativa', c.text.secondary, c.bg.surface],
    ['botão primário', c.action.onPrimary, c.action.primary],
    ['botão primário pressionado', c.action.onPrimary, c.action.primaryPressed],
    ['botão secundário / Editar ao deslizar', c.action.onSecondary, c.action.secondary],
    ['Apagar ao deslizar', c.action.onDestructive, c.action.destructive],
    ['receita', c.money.income, c.bg.surface],
    ['dívida / estouro', c.money.debt, c.bg.surface],
    ['transferência', c.money.transfer, c.bg.surface],
    ['zero', c.money.zero, c.bg.surface],
    ['perto do limite', c.status.warning, c.bg.surface],
    ['erro', c.status.danger, c.bg.surface],
    ['erro no aviso', c.status.danger, c.status.dangerSurface],
    ['aviso informativo', c.text.primary, c.status.infoSurface],
    ['faixa sem conexão', c.text.secondary, c.bg.sunken],
    ['toast', c.text.primary, c.bg.raised],
  ];
  it.each(textPairs)('%s ≥ 4,5:1', (_name, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(TEXT);
  });

  it.each([
    ['número principal', c.text.primary],
    ['número principal (gasto)', c.money.expense],
    ['número principal (faltaram)', c.money.debt],
  ])('%s ≥ 7:1 na superfície', (_name, fg) => {
    expect(contrastRatio(fg, c.bg.surface)).toBeGreaterThanOrEqual(MAIN_NUMBER);
  });

  it.each([
    ['hachura do estouro sobre a superfície', c.budget.over, c.bg.surface],
    ['hachura do mês parcial', c.chart.comparison, c.bg.surface],
    ['orçamento folgado', c.budget.ok, c.bg.surface],
    ['orçamento perto', c.budget.near, c.bg.surface],
    ['plano da sobra na régua', c.chart.main, c.bg.surface],
    ['borda de campo', c.border.strong, c.bg.surface],
    ['borda de categoria selecionada', c.border.focus, c.bg.selection],
  ])('%s ≥ 3:1', (_name, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(GRAPHIC);
  });
});
