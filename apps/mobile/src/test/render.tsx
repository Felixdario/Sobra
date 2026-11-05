import { createMemoryTokenStore, type FetchLike } from '@sobra/client';
import type { TokenPair } from '@sobra/shared';
import { render } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../api/AuthProvider';
import { createServices, type Services } from '../api/services';
import { ServicesProvider } from '../api/ServicesProvider';
import { LaunchSheetProvider } from '../features/launch/LaunchSheetProvider';
import { ThemeProvider } from '../theme/ThemeProvider';
import { ToastProvider } from '../ui/Toast';

export type Call = { method: string; path: string; query: URLSearchParams; body: unknown };
type Reply =
  | { status?: number; body?: unknown }
  | ((call: Call) => Promise<{ status?: number; body?: unknown }>);
export type Routes = Record<string, Reply>;

/**
 * Fake fetch keyed by "METHOD /path". Unknown routes answer 404 so a missing fixture fails
 * loudly. Every call is recorded with its parsed body.
 */
export function fakeFetch(routes: Routes) {
  const calls: Call[] = [];
  const fetch = async (url: string, init: { method: string; body?: string }) => {
    const [base = '', search = ''] = url.split('?');
    const path = base.replace(/^https?:\/\/[^/]+/, '');
    const key = `${init.method} ${path}`;
    calls.push({
      method: init.method,
      path,
      query: new URLSearchParams(search),
      body: init.body ? JSON.parse(init.body) : undefined,
    });
    const route = routes[key];
    const reply = typeof route === 'function' ? await route(calls[calls.length - 1]!) : route;
    const status = reply?.status ?? (reply ? 200 : 404);
    const body =
      reply?.body ??
      (reply ? undefined : { error: { code: 'NOT_FOUND', message: `Sem fixture para ${key}` } });
    return { status, text: async () => (body === undefined ? '' : JSON.stringify(body)) };
  };
  return { fetch: fetch as unknown as FetchLike, calls };
}

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

export function createTestServices(routes: Routes, session: TokenPair | null = null) {
  const { fetch, calls } = fakeFetch(routes);
  const services = createServices({
    baseUrl: 'http://api.test',
    tokenStore: createMemoryTokenStore(session),
    fetch,
    retry: false,
  });
  // No garbage-collection timers left behind after a test.
  const defaults = services.queryClient.getDefaultOptions();
  services.queryClient.setDefaultOptions({
    queries: { ...defaults.queries, gcTime: Infinity },
    mutations: { ...defaults.mutations, gcTime: Infinity },
  });
  return { services, calls };
}

export type RenderOptions = {
  /**
   * System text size multiplier (Dynamic Type / Android font size). Defaults to 1: React
   * Native's Jest mock reports a window fontScale of 2.
   */
  fontScale?: number;
};

export function Providers({
  services,
  fontScale,
  children,
}: {
  services: Services;
  fontScale?: number | undefined;
  children: ReactNode;
}) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={metrics}>
        <ThemeProvider fontScale={fontScale ?? 1}>
          <ServicesProvider services={services}>
            <AuthProvider>
              <ToastProvider>
                <LaunchSheetProvider>{children}</LaunchSheetProvider>
              </ToastProvider>
            </AuthProvider>
          </ServicesProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export async function renderWithServices(
  ui: ReactElement,
  routes: Routes,
  session: TokenPair | null = null,
  options: RenderOptions = {},
) {
  const { services, calls } = createTestServices(routes, session);
  const result = await render(
    <Providers services={services} fontScale={options.fontScale}>
      {ui}
    </Providers>,
  );
  return { ...result, services, calls };
}
