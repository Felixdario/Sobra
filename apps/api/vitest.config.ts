import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    testTimeout: 20_000,
    // Safety net only: the suite stays fast because createTestApp hashes with ARGON2_PROFILE=test.
    hookTimeout: 30_000,
    globalSetup: ['src/test/global-setup.ts'],
  },
});
