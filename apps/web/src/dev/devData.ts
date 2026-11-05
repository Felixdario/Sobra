import { CSRF_COOKIE, type CookieAccess, type ServicesOptions } from '../lib/services';
import { BASE_URL, createFakeApi } from '../test/fakeApi';
import { SCENARIOS, scenarioHandler, type Scenario } from './scenarios';

/** sessionStorage key of the chosen scenario; `?dados=<cenário>` on any URL sets it. */
export const DEV_DATA_KEY = 'sobra.dev.dados';

function readScenario(): Scenario | null {
  const fromUrl = new URLSearchParams(window.location.search).get('dados');
  if (fromUrl === 'demo') window.sessionStorage.removeItem(DEV_DATA_KEY);
  else if (fromUrl && (SCENARIOS as readonly string[]).includes(fromUrl)) {
    window.sessionStorage.setItem(DEV_DATA_KEY, fromUrl);
  }
  const stored = window.sessionStorage.getItem(DEV_DATA_KEY);
  return stored && (SCENARIOS as readonly string[]).includes(stored) ? (stored as Scenario) : null;
}

/** In-memory cookies with a session already in them: a scenario never touches the real session. */
function scenarioCookies(): CookieAccess {
  const values = new Map<string, string>([[CSRF_COOKIE, 'dev-csrf']]);
  return {
    get: (name) => values.get(name) ?? null,
    remove: (name) => void values.delete(name),
  };
}

/**
 * Dev only (imported behind `import.meta.env.DEV`, so it never reaches the production bundle):
 * swaps the API for a scenario at the `fetch` boundary, the same one the tests use.
 */
export function devServicesOptions(): { scenario: Scenario | null; options: ServicesOptions } {
  const scenario = readScenario();
  if (!scenario) return { scenario, options: {} };
  const api = createFakeApi(scenarioHandler(scenario));
  return {
    scenario,
    options: { baseUrl: BASE_URL, fetch: api.fetch, cookies: scenarioCookies(), retry: false },
  };
}

export function chooseScenario(scenario: Scenario | 'demo') {
  if (scenario === 'demo') window.sessionStorage.removeItem(DEV_DATA_KEY);
  else window.sessionStorage.setItem(DEV_DATA_KEY, scenario);
  const url = new URL(window.location.href);
  url.searchParams.delete('dados');
  window.location.replace(url);
}
