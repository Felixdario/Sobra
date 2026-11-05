import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../test/renderApp';
import { LONG_TEXT, LONG_WORD, scenarioHandler } from './scenarios';

/**
 * Regression tests for the break-ui pass (docs/polimento-web.md): the worst case enters through
 * the same `fetch` boundary as the API. jsdom has no layout, so these pin the decisions that keep
 * the layout intact: exact amounts with the fit-to-box hook, full text in `title` wherever a name
 * is truncated, compact chart labels, separators in counts.
 */
const NBSP = ' ';
const BILLION = `R$${NBSP}1.000.000.000,00`;
const MINUS_ALMOST = `−R$${NBSP}999.999.999,99`;

describe('pior caso: painel', () => {
  it('KPIs e manchete mostram o valor exato e encolhem para caber (--fit-chars)', async () => {
    renderApp(scenarioHandler('pior'), { signedIn: true });
    const card = within(await screen.findByRole('region', { name: 'Novembro de 2026' }));

    const income = await card.findByText(BILLION, { selector: 'dd' });
    expect(income.style.getPropertyValue('--fit-chars')).toBe(String(BILLION.length));
    const headline = card.getAllByText(MINUS_ALMOST).find((el) => el.tagName === 'P');
    expect(headline?.style.getPropertyValue('--fit-chars')).toBe(String(MINUS_ALMOST.length));
  });

  it('nomes truncados na régua e no gráfico de categorias guardam o nome inteiro no title', async () => {
    renderApp(scenarioHandler('pior'), { signedIn: true });

    const ruler = await screen.findByRole('img', { name: /^Receitas de novembro/ });
    const legend = ruler.parentElement!;
    expect(within(legend).getByTitle(LONG_WORD)).toBeInTheDocument();
    const chart = screen.getByRole('region', { name: 'Gastos por categoria' });
    expect(within(chart).getByTitle(LONG_WORD)).toHaveTextContent(LONG_WORD);
  });

  it('o rótulo no fim da linha do saldo fica compacto; o exato vai para a tabela', async () => {
    renderApp(scenarioHandler('pior'), { signedIn: true });

    const card = within(await screen.findByRole('region', { name: 'Evolução do saldo' }));
    expect(await card.findByText(`−R$${NBSP}1${NBSP}bi`)).toBeInTheDocument();
  });

  it('o painel mostra só os 6 orçamentos que pedem atenção e leva à lista inteira', async () => {
    renderApp(scenarioHandler('pior'), { signedIn: true });
    const card = within(await screen.findByRole('region', { name: 'Orçado × realizado' }));

    expect(await card.findAllByRole('progressbar')).toHaveLength(6);
    expect(card.getByRole('link', { name: 'Ver todos os 14 orçamentos' })).toHaveAttribute(
      'href',
      '/orcamentos',
    );
  });

  it('orçamento 1000% estourado e orçamento sem gasto são ditos por extenso', async () => {
    renderApp(scenarioHandler('pior'), { path: '/orcamentos', signedIn: true });

    const over = await screen.findByRole('progressbar', { name: LONG_WORD });
    expect(over).toHaveAttribute('aria-valuetext', expect.stringContaining('1000% do orçamento'));
    const unused = screen.getByRole('progressbar', { name: 'Saúde & Farmácia 💊' });
    expect(unused).toHaveAttribute('aria-valuetext', expect.stringContaining('0% do orçamento'));
  });
});

describe('pior caso: telas de gestão', () => {
  it('a tabela de transações trunca descrição e conta com o texto inteiro no title', async () => {
    renderApp(scenarioHandler('pior'), { path: '/transacoes', signedIn: true });

    const table = await screen.findByRole('table');
    expect(within(table).getAllByTitle(LONG_WORD).length).toBeGreaterThan(0);
    expect(within(table).getAllByTitle(LONG_TEXT).length).toBeGreaterThan(0);
    expect(within(table).getAllByText(`+${BILLION}`).length).toBeGreaterThan(0);
    expect(screen.getByText('1–20 de 1.284 transações')).toBeInTheDocument();
  });

  it('contas e categorias com nome longo guardam o nome inteiro no title', async () => {
    renderApp(scenarioHandler('pior'), { path: '/contas', signedIn: true });
    expect(await screen.findByTitle(LONG_TEXT)).toBeInTheDocument();
    expect(screen.getByText(MINUS_ALMOST)).toBeInTheDocument();
  });

  it('importações anteriores: contagens com separador e conta que não existe mais', async () => {
    renderApp(scenarioHandler('pior'), { path: '/importar', signedIn: true });
    expect(await screen.findByText(/4\.998 importados, 2 ignorados/)).toBeInTheDocument();
    expect(screen.getByText(/conta removida · 1 importado$/)).toBeInTheDocument();
  });
});

describe('cenários de borda', () => {
  it('uma transação só: singular na paginação', async () => {
    renderApp(scenarioHandler('uma'), { path: '/transacoes', signedIn: true });
    expect(await screen.findByText('1–1 de 1 transação')).toBeInTheDocument();
  });

  it('usuário novo: as telas mostram o vazio com o próximo passo', async () => {
    renderApp(scenarioHandler('novo'), { signedIn: true });
    expect(await screen.findByText('Nenhum lançamento em novembro.')).toBeInTheDocument();
    expect(await screen.findByText('Sem histórico de saldo ainda.')).toBeInTheDocument();
  });

  it('erro 500 em todas as leituras: cada bloco diz o que falhou e oferece tentar de novo', async () => {
    renderApp(scenarioHandler('erro-500'), { path: '/contas', signedIn: true });
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Não deu para carregar as contas');
    expect(within(alert).getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
  });
});
