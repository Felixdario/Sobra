import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vite';
import { buildTokensCss } from './src/theme/tokensCss';

const TOKENS_ID = 'virtual:sobra-tokens.css';
const RESOLVED_TOKENS_ID = `\0${TOKENS_ID}`;

/** Serves the CSS generated from @financas/tokens as a stylesheet, so it lands in the built CSS. */
function sobraTokens(): Plugin {
  return {
    name: 'sobra-tokens',
    resolveId: (id) => (id === TOKENS_ID ? RESOLVED_TOKENS_ID : undefined),
    load: (id) => (id === RESOLVED_TOKENS_ID ? buildTokensCss() : undefined),
  };
}

const API_TARGET = process.env.VITE_API_PROXY ?? 'http://localhost:3333';

export default defineConfig({
  plugins: [sobraTokens(), react()],
  server: {
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
