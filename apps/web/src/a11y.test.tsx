import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import { scenarioHandler } from './dev/scenarios';
import { renderApp } from './test/renderApp';

/**
 * axe-core over every main screen, with the worst-case data (long names, emoji, CJK, huge
 * amounts) so the check also covers the states demo data never reaches. jsdom has no layout, so
 * `color-contrast` runs in the real-browser pass (docs/polimento-web.md) and in
 * packages/tokens/src/contrast.test.ts; everything else (names, roles, landmarks, headings,
 * tables, ARIA) runs here and fails the build on a serious or critical violation.
 */
async function seriousViolations() {
  const result = await axe.run(document.body, {
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  return result.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

const SCREENS = [
  { path: '/', ready: () => screen.findByRole('img', { name: /^Receitas de novembro/ }) },
  { path: '/transacoes', ready: () => screen.findByRole('table') },
  { path: '/orcamentos', ready: () => screen.findAllByRole('progressbar') },
  { path: '/contas', ready: () => screen.findByRole('heading', { name: 'Contas ativas' }) },
  { path: '/categorias', ready: () => screen.findByRole('heading', { name: 'Despesas' }) },
  { path: '/importar', ready: () => screen.findByText(/4\.998 importados/) },
];

describe('acessibilidade (axe-core): sem violações sérias ou críticas', () => {
  for (const { path, ready } of SCREENS) {
    it(`tela ${path}`, async () => {
      renderApp(scenarioHandler('pior'), { path, signedIn: true });
      await ready();
      expect(await seriousViolations()).toEqual([]);
    });
  }

  it('painel de edição de transação aberto', async () => {
    renderApp(scenarioHandler('pior'), { path: '/transacoes', signedIn: true });
    const table = await screen.findByRole('table');
    await userEvent.setup().click(within(table).getAllByRole('button', { name: /^Editar/ })[0]!);
    await screen.findByRole('dialog', { name: 'Editar transação' });
    expect(await seriousViolations()).toEqual([]);
  });

  it('usuário novo (vazios)', async () => {
    renderApp(scenarioHandler('novo'), { signedIn: true });
    await screen.findByText('Nenhum lançamento em novembro.');
    expect(await seriousViolations()).toEqual([]);
  });

  it('erro 500 em todos os blocos do painel', async () => {
    renderApp(scenarioHandler('erro-500'), { signedIn: true });
    await screen.findAllByRole('alert');
    expect(await seriousViolations()).toEqual([]);
  });
});

describe('teclado', () => {
  it('fechar o painel de edição devolve o foco à linha que o abriu', async () => {
    renderApp(scenarioHandler('pior'), { path: '/transacoes', signedIn: true });
    const ui = userEvent.setup();
    const table = await screen.findByRole('table');
    const trigger = within(table).getAllByRole('button', { name: /^Editar/ })[0]!;
    await ui.click(trigger);
    const dialog = await screen.findByRole('dialog', { name: 'Editar transação' });
    await ui.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(trigger).toHaveFocus();
  });
});
