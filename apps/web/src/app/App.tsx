import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, type createBrowserRouter } from 'react-router';
import { Toaster } from 'sonner';
import { I18nProvider } from '../i18n/I18nProvider';
import { useI18n } from '../i18n/i18nContext';
import type { Services } from '../lib/services';
import { ServicesContext } from '../lib/servicesContext';
import { ThemeProvider } from '../theme/ThemeProvider';
import { useTheme } from '../theme/themeContext';
import toastStyles from './Toaster.module.css';

type AppRouter = ReturnType<typeof createBrowserRouter>;

/** One Toaster at the root, following the resolved theme, styled through the tokens. */
function ThemedToaster() {
  const { resolved } = useTheme();
  const { t } = useI18n();
  return (
    <Toaster
      theme={resolved}
      position="bottom-right"
      closeButton
      containerAriaLabel={t('web.app.toaster.region')}
      toastOptions={{
        className: toastStyles.toast ?? '',
        closeButtonAriaLabel: t('web.app.toaster.close'),
      }}
    />
  );
}

export function App({ services, router }: { services: Services; router: AppRouter }) {
  return (
    <ServicesContext value={services}>
      <QueryClientProvider client={services.queryClient}>
        <I18nProvider>
          <ThemeProvider>
            <RouterProvider router={router} />
            <ThemedToaster />
          </ThemeProvider>
        </I18nProvider>
      </QueryClientProvider>
    </ServicesContext>
  );
}
