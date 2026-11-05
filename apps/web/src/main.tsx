import '@fontsource/archivo/400.css';
import '@fontsource/archivo/500.css';
import '@fontsource/archivo/600.css';
import 'virtual:sobra-tokens.css';
import './styles/global.css';
import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router';
import { App } from './app/App';
import { routes } from './app/routes';
import { createServices, type ServicesOptions } from './lib/services';

const root = document.getElementById('root');
if (!root) throw new Error('Elemento #root não encontrado');
const container = root;

async function start() {
  let options: ServicesOptions = {};
  let devChrome: ReactNode = null;
  // break-ui data switch: `import.meta.env.DEV` is a literal `false` in the production build,
  // so this branch and the scenario modules are dropped from the bundle.
  if (import.meta.env.DEV) {
    const [{ devServicesOptions }, { DevDataSwitch }] = await Promise.all([
      import('./dev/devData'),
      import('./dev/DevDataSwitch'),
    ]);
    const dev = devServicesOptions();
    options = dev.options;
    devChrome = <DevDataSwitch active={dev.scenario} />;
  }

  const services = createServices({ locks: navigator.locks, ...options });
  const router = createBrowserRouter(routes);

  createRoot(container).render(
    <StrictMode>
      <App services={services} router={router} />
      {devChrome}
    </StrictMode>,
  );
}

void start();
