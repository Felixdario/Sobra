import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/money/**/*.ts', 'src/date/**/*.ts'],
      exclude: ['**/*.test.ts'],
      reporter: ['text'],
      thresholds: {
        'src/money/**': { lines: 100 },
        'src/date/**': { lines: 100 },
      },
    },
  },
});
