import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPreviewHtml } from './render-preview';

export const previewPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../docs/design/tokens.html',
);

mkdirSync(dirname(previewPath), { recursive: true });
writeFileSync(previewPath, renderPreviewHtml(), 'utf8');
console.log(`Referência visual gerada em ${previewPath}`);
