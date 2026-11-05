import { isApiError } from '@financas/client';
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useServices } from './ServicesProvider';

export type AuthStatus = 'checking' | 'signedIn' | 'signedOut';

type AuthContextValue = {
  status: AuthStatus;
  /** Shown once on the sign-in screen, e.g. after the session expired. */
  notice: string | null;
  markSignedIn: () => void;
  markSignedOut: (notice?: string) => void;
  clearNotice: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const SESSION_EXPIRED_NOTICE = 'Sua sessão expirou. Entre de novo para continuar.';

function endsSession(error: unknown): boolean {
  return isApiError(error) && (error.code === 'SESSION_EXPIRED' || error.status === 401);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const services = useServices();
  const [status, setStatus] = useState<AuthStatus>('checking');
  const [notice, setNotice] = useState<string | null>(null);

  const markSignedOut = useCallback((message?: string) => {
    setNotice(message ?? null);
    setStatus('signedOut');
  }, []);

  useEffect(
    () => services.onSessionExpired(() => markSignedOut(SESSION_EXPIRED_NOTICE)),
    [services, markSignedOut],
  );

  useEffect(() => {
    let active = true;
    async function restore() {
      const tokens = await services.tokenStore.get();
      if (!tokens) return 'signedOut' as const;
      try {
        // Straight to the client, not fetchQuery: an expired session clears the query cache,
        // which would cancel the query and hide the real reason.
        const user = await services.api.auth.me();
        services.queryClient.setQueryData(services.queries.me().queryKey, user);
        return 'signedIn' as const;
      } catch (error) {
        // Offline at boot keeps the stored session: the app opens and says it has no connection.
        return endsSession(error) ? ('signedOut' as const) : ('signedIn' as const);
      }
    }
    restore()
      .catch(() => 'signedOut' as const)
      .then((next) => {
        if (active) setStatus(next);
      });
    return () => {
      active = false;
    };
  }, [services]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      notice,
      markSignedIn: () => {
        setNotice(null);
        setStatus('signedIn');
      },
      markSignedOut,
      clearNotice: () => setNotice(null),
    }),
    [status, notice, markSignedOut],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const value = use(AuthContext);
  if (!value) throw new Error('useAuth precisa de <AuthProvider>');
  return value;
}
