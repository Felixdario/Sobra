import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, type createBrowserRouter } from 'react-router';
import { Toaster } from 'sonner';
import type { Services } from '../lib/services';
import { ServicesContext } from '../lib/servicesContext';
import { ThemeProvider } from '../theme/ThemeProvider';
import { useTheme } from '../theme/themeContext';
import toastStyles from './Toaster.module.css';

type AppRouter = ReturnType<typeof createBrowserRouter>;

/** One Toaster at the root, following the resolved theme, styled through the tokens. */
function ThemedToaster() {
  const { resolved } = useTheme();
  return (
    <Toaster
      theme={resolved}
      position="bottom-right"
      closeButton
      containerAriaLabel="Notificações"
      toastOptions={{ className: toastStyles.toast ?? '', closeButtonAriaLabel: 'Fechar aviso' }}
    />
  );
}

export function App({ services, router }: { services: Services; router: AppRouter }) {
  return (
    <ServicesContext value={services}>
      <QueryClientProvider client={services.queryClient}>
        <ThemeProvider>
          <RouterProvider router={router} />
          <ThemedToaster />
        </ThemeProvider>
      </QueryClientProvider>
    </ServicesContext>
  );
}
