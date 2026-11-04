import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    templateDatabase: string;
  }
}

const apiRoot = resolve(import.meta.dirname, '../..');

/** Migrates one template database per run; each test file copies it (see `createTestApp`). */
export default function setup(project: TestProject) {
  const dir = mkdtempSync(join(tmpdir(), 'financas-api-test-'));
  const templateDatabase = join(dir, 'template.db');

  execFileSync(
    process.execPath,
    [join(apiRoot, 'node_modules/prisma/build/index.js'), 'migrate', 'deploy'],
    {
      cwd: apiRoot,
      env: {
        ...process.env,
        DATABASE_URL: `file:${templateDatabase}`,
        PRISMA_HIDE_UPDATE_MESSAGE: '1',
      },
      stdio: 'pipe',
    },
  );

  project.provide('templateDatabase', templateDatabase);

  return () => rmSync(dir, { recursive: true, force: true });
}
