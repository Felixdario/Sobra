import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { renderPreviewHtml } from '../scripts/render-preview';

const previewPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../docs/design/tokens.html',
);

describe('docs/design/tokens.html', () => {
  it('está atualizado com os tokens (rode build:preview se falhar)', () => {
    expect(readFileSync(previewPath, 'utf8').replace(/\r\n/g, '\n')).toBe(renderPreviewHtml());
  });

  it('mostra os dois temas e os três estados de orçamento', () => {
    const html = renderPreviewHtml();
    expect(html).toContain('class="pane theme-light"');
    expect(html).toContain('class="pane theme-dark"');
    expect(html).toContain('class="budget ok"');
    expect(html).toContain('class="budget near"');
    expect(html).toContain('class="budget over"');
    expect(html).not.toMatch(/undefined|NaN/);
  });
});
