import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LEGACY_REFRESH_KEY, SESSION_EXPIRED_EVENT } from '../lib/services';
import { dashboardRoutes, setSessionCookie, tokens, user } from '../test/fakeApi';
import { renderApp } from '../test/renderApp';

const csrfCookie = () => /(?:^|; )sobra_csrf=([^;]*)/.exec(document.cookie)?.[1] ?? null;

/** Nothing in localStorage looks like a refresh token. */
function expectNoTokenInStorage() {
  const values = Object.keys(window.localStorage).map((key) => window.localStorage.getItem(key));
  expect(values.join(' ')).not.toMatch(/refresh/i);
  expect(window.localStorage.getItem(LEGACY_REFRESH_KEY)).toBeNull();
}

const invalidCredentials = {
  status: 401,
  body: { error: { code: 'INVALID_CREDENTIALS', message: 'E-mail ou senha incorretos' } },
};

describe('entrar', () => {
  it('entra no modo cookie e abre o painel sem guardar refresh token no navegador', async () => {
    const { requests } = renderApp(
      {
        ...dashboardRoutes(),
        'POST /auth/login': () => {
          setSessionCookie(); // the API's Set-Cookie (the httpOnly refresh cookie is not visible)
          return { status: 200, body: { user, tokens } };
        },
      },
      { path: '/entrar' },
    );
    const ui = userEvent.setup();
    await ui.type(await screen.findByLabelText('E-mail'), '  Demo@Sobra.dev ');
    await ui.type(screen.getByLabelText('Senha'), 'demo1234');
    await ui.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('heading', { name: 'Painel', level: 1 })).toBeInTheDocument();
    const login = requests.find((r) => r.path === '/auth/login');
    expect(login?.body).toEqual({ email: 'demo@sobra.dev', password: 'demo1234' });
    expect(login).toMatchObject({ credentials: 'include', headers: { 'x-sobra-client': 'web' } });
    const dataRequests = () => requests.filter((r) => !r.path.startsWith('/auth/'));
    await waitFor(() => expect(dataRequests().length).toBeGreaterThan(0));
    expect(new Set(dataRequests().map((r) => r.headers.authorization))).toEqual(
      new Set(['Bearer access-1']),
    );
    expect(requests.some((r) => r.path === '/auth/refresh')).toBe(false);
    expectNoTokenInStorage();
  });

  it('mostra o erro da API em português quando a senha está errada', async () => {
    renderApp({ 'POST /auth/login': () => invalidCredentials }, { path: '/entrar' });
    const ui = userEvent.setup();
    await ui.type(await screen.findByLabelText('E-mail'), 'demo@sobra.dev');
    await ui.type(screen.getByLabelText('Senha'), 'errada123');
    await ui.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos');
    expect(csrfCookie()).toBeNull();
  });

  it('valida os campos com os schemas do shared antes de chamar a API', async () => {
    const { requests } = renderApp({}, { path: '/entrar' });
    const ui = userEvent.setup();
    await ui.type(await screen.findByLabelText('E-mail'), 'nao-e-email');
    await ui.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('E-mail inválido')).toBeInTheDocument();
    expect(screen.getByText('Informe a senha')).toBeInTheDocument();
    expect(requests).toHaveLength(0);
  });

  it('o botão de demonstração preenche o e-mail e a senha da conta demo', async () => {
    renderApp({}, { path: '/entrar' });
    await userEvent
      .setup()
      .click(await screen.findByRole('button', { name: 'Entrar com a conta de demonstração' }));

    expect(screen.getByLabelText('E-mail')).toHaveValue('demo@sobra.dev');
    expect(screen.getByLabelText('Senha')).toHaveValue('demo1234');
  });
});

describe('criar conta', () => {
  it('mostra as mensagens dos schemas do shared em português', async () => {
    renderApp({}, { path: '/criar-conta' });
    const ui = userEvent.setup();
    await ui.type(await screen.findByLabelText('Senha'), 'curta');
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

  it('página recarregada com sessão no cookie: renova pelo cookie (com CSRF) e abre a página pedida', async () => {
    const { requests } = renderApp(dashboardRoutes(), { path: '/orcamentos', signedIn: true });

    expect(
      await screen.findByRole('heading', { name: 'Orçamentos', level: 1 }),
    ).toBeInTheDocument();
    const refreshes = requests.filter((r) => r.path === '/auth/refresh');
    expect(refreshes).toHaveLength(1);
    expect(refreshes[0]).toMatchObject({
      body: undefined,
      credentials: 'include',
      headers: { 'x-sobra-client': 'web', 'x-csrf-token': 'csrf-1' },
    });
    expect(requests.indexOf(refreshes[0]!)).toBe(0);
    expect(requests.find((r) => r.path === '/me')?.headers.authorization).toBe('Bearer access-1');
  });

  it('apaga o refresh token que versões antigas deixaram no localStorage', async () => {
    window.localStorage.setItem(LEGACY_REFRESH_KEY, 'refresh-antigo');
    renderApp(dashboardRoutes(), { path: '/', signedIn: true });

    expect(await screen.findByRole('heading', { name: 'Painel', level: 1 })).toBeInTheDocument();
    expectNoTokenInStorage();
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
    expect(csrfCookie()).toBeNull();
  });
});

describe('sair', () => {
  it('chama a API pelo cookie, apaga o cookie de CSRF e volta ao login', async () => {
    const { requests, router, services } = renderApp(
      { ...dashboardRoutes(), 'POST /auth/logout': () => ({ status: 204 }) },
      { path: '/', signedIn: true },
    );
    const expired = vi.fn();
    services.events.addEventListener(SESSION_EXPIRED_EVENT, expired);
    await screen.findByRole('heading', { name: 'Painel', level: 1 });

    await userEvent.setup().click(screen.getAllByRole('button', { name: 'Sair' })[0]!);

    await waitFor(() => expect(router.state.location.pathname).toBe('/entrar'));
    expect(requests.find((r) => r.path === '/auth/logout')).toMatchObject({
      body: undefined,
      credentials: 'include',
      headers: { 'x-csrf-token': 'csrf-1' },
    });
    expect(csrfCookie()).toBeNull();
    expect(await screen.findByRole('heading', { name: 'Entrar no Sobra' })).toBeInTheDocument();
    // Queries still mounted while logging out must not try the cookie and announce an expiry.
    expect(requests.filter((r) => r.path === '/auth/refresh')).toHaveLength(1);
    expect(expired).not.toHaveBeenCalled();
  });
});
