import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  matchValidationMessage,
  VALIDATION_KEYS,
  VALIDATION_MESSAGES,
  validationMessage,
} from './messages';

const sampleParams = { max: 80, min: 8, column: 'Valor' };

describe('validationMessage / matchValidationMessage', () => {
  it('monta o texto pt-BR com os parâmetros', () => {
    expect(validationMessage('name.tooLong', { max: 40 })).toBe(
      'O nome deve ter no máximo 40 caracteres',
    );
    expect(validationMessage('auth.emailInvalid')).toBe('E-mail inválido');
  });

  it('recupera chave e parâmetros de toda mensagem do registro', () => {
    for (const key of VALIDATION_KEYS) {
      const text = (validationMessage as (k: string, p: object) => string)(key, sampleParams);
      expect(text).not.toMatch(/\{\w+\}/);
      const match = matchValidationMessage(text);
      expect(match?.key).toBe(key);
      for (const name of Object.keys(match?.params ?? {})) {
        expect(match?.params[name]).toBe(sampleParams[name as keyof typeof sampleParams]);
      }
    }
  });

  it('dois textos nunca colidem e mensagens de fora não casam', () => {
    const texts = Object.values(VALIDATION_MESSAGES);
    expect(new Set(texts).size).toBe(texts.length);
    expect(matchValidationMessage('Entrada inválida')).toBeNull();
    expect(matchValidationMessage('E-mail inválido!')).toBeNull();
  });

  it('nenhum schema escreve mensagem literal: tudo passa pelo registro', () => {
    const dir = import.meta.dirname;
    const sources = readdirSync(dir).filter(
      (file) => file.endsWith('.ts') && !file.endsWith('.test.ts') && file !== 'messages.ts',
    );
    expect(sources.length).toBeGreaterThan(5);
    for (const file of sources) {
      const source = readFileSync(join(dir, file), 'utf8');
      // `error:` or `message:` followed by a string or template literal.
      const literals = source.match(/\b(error|message):\s*['"`]/g) ?? [];
      expect([file, literals]).toEqual([file, []]);
    }
  });
});
