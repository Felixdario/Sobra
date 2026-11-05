import { createTranslator } from '@sobra/i18n';
import { describe, expect, it } from 'vitest';
import { CLIENT_ERROR_CODES } from './errors';

describe('códigos de erro do cliente', () => {
  it('todos têm tradução em @sobra/i18n (errors.<code>) nos dois idiomas', () => {
    for (const locale of ['pt-BR', 'en-US'] as const) {
      const t = createTranslator(locale);
      for (const code of Object.values(CLIENT_ERROR_CODES)) {
        expect([locale, code, t.has(`errors.${code}`)]).toEqual([locale, code, true]);
      }
    }
  });
});
