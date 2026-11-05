import { isApiError } from '@financas/client';
import { useQuery } from '@tanstack/react-query';
import { Navigate, Outlet, useLocation } from 'react-router';
import { ErrorLine } from '../components/ErrorLine';
import { useServices } from '../lib/servicesContext';
import styles from './ProtectedRoute.module.css';

const isSessionError = (error: unknown) =>
  isApiError(error) && (error.code === 'SESSION_EXPIRED' || error.status === 401);

export function ProtectedRoute() {
  const { queries, hasStoredSession } = useServices();
  const location = useLocation();
  const stored = hasStoredSession();
  const me = useQuery({ ...queries.me(), enabled: stored, staleTime: Infinity });

  if (!stored || (me.isError && isSessionError(me.error))) {
    return <Navigate to="/entrar" replace state={{ from: location.pathname + location.search }} />;
  }
  if (me.isError) {
    return (
      <main className={styles.blocked}>
        <ErrorLine
          what="Não deu para abrir sua sessão"
          error={me.error}
          onRetry={() => void me.refetch()}
          retrying={me.isFetching}
        />
      </main>
    );
  }
  if (me.isPending) return <main className={styles.blocked} aria-busy="true" />;
  return <Outlet />;
}
