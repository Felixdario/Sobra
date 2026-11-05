import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Separate from vite.config.ts: that one loads @sobra/tokens (TS source) at config time,
// which needs `--configLoader runner`; tests import the tokens through Vite's transform instead.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    testTimeout: 20_000,
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
});
