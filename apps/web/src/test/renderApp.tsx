import { render } from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import { vi } from 'vitest';
import { App } from '../app/App';
import { routes } from '../app/routes';
import { createServices, REFRESH_KEY } from '../lib/services';
import { BASE_URL, createFakeApi, type FakeHandler, type FakeRoutes } from './fakeApi';

/** "Today" for every app test: day 4 of November 2026 in São Paulo. */
export const NOW = new Date('2026-11-04T12:00:00-03:00');

type RenderAppOptions = { path?: string; signedIn?: boolean };

export function renderApp(
  apiRoutes: FakeRoutes | FakeHandler,
  { path = '/', signedIn = false }: RenderAppOptions = {},
) {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  if (signedIn) window.localStorage.setItem(REFRESH_KEY, 'refresh-0');
  const api = createFakeApi(apiRoutes);
  const services = createServices({ baseUrl: BASE_URL, fetch: api.fetch, retry: false });
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const view = render(<App services={services} router={router} />);
  return { ...view, router, services, requests: api.requests };
}
