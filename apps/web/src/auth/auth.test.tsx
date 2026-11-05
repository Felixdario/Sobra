import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { REFRESH_KEY } from '../lib/services';
import { dashboardRoutes, tokens, user } from '../test/fakeApi';
import { renderApp } from '../test/renderApp';

const invalidCredentials = {
  status: 401,
  body: { error: { code: 'INVALID_CREDENTIALS', message: 'E-mail ou senha incorretos' } },
};

describe('entrar', () => {
  it('entra com e-mail e senha, guarda o refresh token e abre o painel', async () => {
    const { requests } = renderApp(
      { ...dashboardRoutes(), 'POST /auth/login': () => ({ status: 200, body: { user, tokens } }) },
      { path: '/entrar' },
    );
    const ui = userEvent.setup();
    await ui.type(screen.getByLabelText('E-mail'), '  Demo@Financas.dev ');
    await ui.type(screen.getByLabelText('Senha'), 'demo1234');
    await ui.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('heading', { name: 'Painel', level: 1 })).toBeInTheDocument();
    const login = requests.find((r) => r.path === '/auth/login');
    expect(login?.body).toEqual({ email: 'demo@financas.dev', password: 'demo1234' });
    expect(window.localStorage.getItem(REFRESH_KEY)).toBe(tokens.refreshToken);
  });

  it('mostra o erro da API em português quando a senha está errada', async () => {
    renderApp({ 'POST /auth/login': () => invalidCredentials }, { path: '/entrar' });
    const ui = userEvent.setup();
    await ui.type(screen.getByLabelText('E-mail'), 'demo@financas.dev');
    await ui.type(screen.getByLabelText('Senha'), 'errada123');
    await ui.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos');
    expect(window.localStorage.getItem(REFRESH_KEY)).toBeNull();
  });

  it('valida os campos com os schemas do shared antes de chamar a API', async () => {
    const { requests } = renderApp({}, { path: '/entrar' });
    const ui = userEvent.setup();
    await ui.type(screen.getByLabelText('E-mail'), 'nao-e-email');
    await ui.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('E-mail inválido')).toBeInTheDocument();
    expect(screen.getByText('Informe a senha')).toBeInTheDocument();
    expect(requests).toHaveLength(0);
  });

  it('o botão de demonstração preenche o e-mail e a senha da conta demo', async () => {
    renderApp({}, { path: '/entrar' });
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Entrar com a conta de demonstração' }));

    expect(screen.getByLabelText('E-mail')).toHaveValue('demo@financas.dev');
    expect(screen.getByLabelText('Senha')).toHaveValue('demo1234');
  });
});

describe('criar conta', () => {
  it('mostra as mensagens dos schemas do shared em português', async () => {
    renderApp({}, { path: '/criar-conta' });
    const ui = userEvent.setup();
    await ui.type(screen.getByLabelText('Senha'), 'curta');
    await ui.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(await screen.findByText('A senha deve ter no mínimo 8 caracteres')).toBeInTheDocument();
    expect(screen.getByText('E-mail inválido')).toBeInTheDocument();
  });
});

describe('rota protegida', () => {
  it('sem sessão, manda para /entrar', async () => {
    const { router } = renderApp(dashboardRoutes(), { path: '/orcamentos' });

    expect(await screen.findByRole('heading', { name: 'Entrar no Sobra' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/entrar');
    expect(router.state.location.state).toEqual({ from: '/orcamentos' });
  });

  it('com sessão guardada, renova o token e abre a página pedida', async () => {
    renderApp(dashboardRoutes(), { path: '/orcamentos', signedIn: true });

    expect(
      await screen.findByRole('heading', { name: 'Orçamentos', level: 1 }),
    ).toBeInTheDocument();
  });

  it('sessão recusada pela API volta ao login com aviso', async () => {
    const expired = {
      status: 401,
      body: {
        error: { code: 'UNAUTHORIZED', message: 'Sessão expirada ou inválida. Entre novamente' },
      },
    };
    const { router } = renderApp(
      { 'POST /auth/refresh': () => expired, 'GET /me': () => expired },
      { path: '/', signedIn: true },
    );

    expect(
      await screen.findByText('Sua sessão expirou. Entre de novo para continuar.'),
    ).toBeInTheDocument();
    await waitFor(() => expect(router.state.location.pathname).toBe('/entrar'));
    expect(window.localStorage.getItem(REFRESH_KEY)).toBeNull();
  });
});
