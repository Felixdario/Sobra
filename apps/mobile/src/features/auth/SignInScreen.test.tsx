import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Text } from 'react-native';
import { useAuth } from '../../api/AuthProvider';
import { tokens, user } from '../../test/fixtures';
import { renderWithServices } from '../../test/render';
import { DEMO_CREDENTIALS, SignInScreen } from './SignInScreen';

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: ReactNode }) => children,
}));

function StatusProbe() {
  const { status } = useAuth();
  return <Text testID="status">{status}</Text>;
}

const screenUnderTest = (
  <>
    <SignInScreen />
    <StatusProbe />
  </>
);

describe('entrar', () => {
  it('com e-mail e senha válidos entra e normaliza o e-mail', async () => {
    const { calls } = await renderWithServices(screenUnderTest, {
      'POST /auth/login': { body: { user, tokens } },
    });
    await fireEvent.changeText(screen.getByLabelText('E-mail'), '  Ana@Exemplo.com ');
    await fireEvent.changeText(screen.getByLabelText('Senha'), 'segredo123');
    await fireEvent.press(screen.getByTestId('sign-in'));

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signedIn'));
    expect(calls.find((call) => call.path === '/auth/login')?.body).toEqual({
      email: 'ana@exemplo.com',
      password: 'segredo123',
    });
  });

  it('mostra as mensagens dos schemas sem chamar a API', async () => {
    const { calls } = await renderWithServices(screenUnderTest, {});
    await fireEvent.changeText(screen.getByLabelText('E-mail'), 'nao-e-email');
    await fireEvent.press(screen.getByTestId('sign-in'));

    expect(await screen.findByText('E-mail inválido')).toBeTruthy();
    expect(screen.getByText('Informe a senha')).toBeTruthy();
    expect(calls.filter((call) => call.path === '/auth/login')).toHaveLength(0);
  });

  it('senha errada mostra a mensagem da API e continua fora', async () => {
    await renderWithServices(screenUnderTest, {
      'POST /auth/login': {
        status: 401,
        body: { error: { code: 'INVALID_CREDENTIALS', message: 'E-mail ou senha incorretos.' } },
      },
    });
    await fireEvent.changeText(screen.getByLabelText('E-mail'), 'ana@exemplo.com');
    await fireEvent.changeText(screen.getByLabelText('Senha'), 'errada123');
    await fireEvent.press(screen.getByTestId('sign-in'));

    expect(await screen.findByText('E-mail ou senha incorretos.')).toBeTruthy();
    expect(screen.getByTestId('status')).toHaveTextContent('signedOut');
  });

  it('o botão de demonstração entra com a conta demo', async () => {
    const { calls } = await renderWithServices(screenUnderTest, {
      'POST /auth/login': { body: { user, tokens } },
    });
    await fireEvent.press(screen.getByTestId('demo'));

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signedIn'));
    expect(calls.find((call) => call.path === '/auth/login')?.body).toEqual(DEMO_CREDENTIALS);
  });

  it('sessão recusada no refresh volta para o login com aviso', async () => {
    await renderWithServices(
      screenUnderTest,
      {
        'GET /me': {
          status: 401,
          body: { error: { code: 'UNAUTHORIZED', message: 'Token expirado.' } },
        },
        'POST /auth/refresh': {
          status: 401,
          body: { error: { code: 'INVALID_REFRESH_TOKEN', message: 'Sessão inválida.' } },
        },
      },
      tokens,
    );
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signedOut'));
    expect(
      await screen.findByText('Sua sessão expirou. Entre de novo para continuar.'),
    ).toBeTruthy();
  });
});
