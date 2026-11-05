import { REFRESH_KEY, type ServicesOptions } from '../lib/services';
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

/** In-memory storage with a session already in it: a scenario never touches the real session. */
function scenarioStorage() {
  const values = new Map<string, string>([[REFRESH_KEY, 'dev-refresh']]);
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
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
    options: { baseUrl: BASE_URL, fetch: api.fetch, storage: scenarioStorage(), retry: false },
  };
}

export function chooseScenario(scenario: Scenario | 'demo') {
  if (scenario === 'demo') window.sessionStorage.removeItem(DEV_DATA_KEY);
  else window.sessionStorage.setItem(DEV_DATA_KEY, scenario);
  const url = new URL(window.location.href);
  url.searchParams.delete('dados');
  window.location.replace(url);
}
