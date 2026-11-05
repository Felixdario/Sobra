import { breakpoints } from '@financas/tokens';
import { useMutation, useQuery } from '@tanstack/react-query';
import { LogOut, Menu, X } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { BrandLockup } from '../components/BrandMark';
import { Button } from '../components/Button';
import { useServices } from '../lib/servicesContext';
import { useMediaQuery } from '../lib/useMediaQuery';
import styles from './AppShell.module.css';
import { NAV_ITEMS } from './navItems';
import { ThemeSwitch } from './ThemeSwitch';

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Principal">
      <ul className={styles.nav}>
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
              onClick={onNavigate}
            >
              <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function AccountFooter() {
  const { queries, mutations } = useServices();
  const navigate = useNavigate();
  const me = useQuery({ ...queries.me(), staleTime: Infinity });
  const logout = useMutation(mutations.auth.logout);
  return (
    <div className={styles.footer}>
      <ThemeSwitch />
      <div className={styles.user}>
        <span className={styles.userText}>
          <span className={styles.userName}>{me.data?.name}</span>
          <span className={styles.userEmail}>{me.data?.email}</span>
        </span>
        <Button
          variant="ghost"
          iconOnly
          aria-label="Sair"
          title="Sair"
          loading={logout.isPending}
          onClick={() =>
            logout.mutate(undefined, { onSettled: () => navigate('/entrar', { replace: true }) })
          }
        >
          {logout.isPending ? null : <LogOut size={20} strokeWidth={1.75} aria-hidden="true" />}
        </Button>
      </div>
    </div>
  );
}

function CompactBar() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const location = useLocation();
  const [path, setPath] = useState(location.pathname);
  if (path !== location.pathname) {
    setPath(location.pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className={styles.compact}>
      <div className={styles.compactBar}>
        <BrandLockup />
        <Button
          variant="ghost"
          iconOnly
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? (
            <X size={20} strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <Menu size={20} strokeWidth={1.75} aria-hidden="true" />
          )}
        </Button>
      </div>
      <div id={panelId} className={styles.panel} data-open={open} inert={!open}>
        <Navigation onNavigate={() => setOpen(false)} />
        <AccountFooter />
      </div>
    </header>
  );
}

const WIDE_QUERY = `(min-width: ${breakpoints.medium}px)`;

export function AppShell() {
  const wide = useMediaQuery(WIDE_QUERY);
  return (
    <div className={styles.shell}>
      {wide ? (
        <aside className={styles.sidebar}>
          <BrandLockup />
          <Navigation />
          <AccountFooter />
        </aside>
      ) : (
        <CompactBar />
      )}
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}
