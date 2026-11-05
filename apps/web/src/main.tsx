import '@fontsource/archivo/400.css';
import '@fontsource/archivo/500.css';
import '@fontsource/archivo/600.css';
import 'virtual:sobra-tokens.css';
import './styles/global.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router';
import { App } from './app/App';
import { routes } from './app/routes';
import { createServices } from './lib/services';

const root = document.getElementById('root');
if (!root) throw new Error('Elemento #root não encontrado');

const services = createServices({ locks: navigator.locks });
const router = createBrowserRouter(routes);

createRoot(root).render(
  <StrictMode>
    <App services={services} router={router} />
  </StrictMode>,
);
