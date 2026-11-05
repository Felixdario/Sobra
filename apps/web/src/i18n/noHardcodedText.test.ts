import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Every text the person sees comes from the catalog (@sobra/i18n). This scan fails the build on
 * a hard-coded text in the app's source: JSX text, user-facing attributes, and any string literal
 * with Portuguese accents. What is allowed, and why, is listed below.
 */
const SRC = join(__dirname, '..');

/** Not shipped or not shown: tests, fixtures and the dev-only data switch (dropped from the build). */
const SKIPPED = [/\.test\.tsx?$/, /^test[\\/]/, /^dev[\\/]/];

/** Literals that are allowed, with the reason. Matched against the literal's text. */
const ALLOWED: { file: string; text: RegExp; why: string }[] = [
  {
    file: 'imports/rowError.ts',
    text: /./,
    why: 'the pt-BR texts the API writes for preview rows, matched to translate them',
  },
  {
    file: 'lib/icons.ts',
    text: /./,
    why: "keys are the palette's own names in @sobra/tokens (IdentityColorName)",
  },
  {
    file: 'imports/previewState.ts',
    text: /^Outros$/,
    why: 'fallback match for a pre-ADR-035 "Outros" category without systemKey (data, not UI)',
  },
  {
    file: 'main.tsx',
    text: /#root/,
    why: 'developer error thrown when index.html is broken, never shown in the UI',
  },
  {
    file: '',
    text: /^use\w+ precisa de <\w+>$/,
    why: 'developer error for a hook used outside its provider',
  },
];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.tsx?$/.test(name) ? [path] : [];
  });
}

/** Comments out, so documentation in Portuguese is not flagged. Strings keep their content. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');
}

const ACCENTED = /[áàâãéêíóôõúüçÁÀÂÃÉÊÍÓÔÕÚÇ]/;
const LITERAL =
  /'([^'\n\\]*(?:\\.[^'\n\\]*)*)'|"([^"\n\\]*(?:\\.[^"\n\\]*)*)"|`([^`\\]*(?:\\.[^`\\]*)*)`/g;
/** Text between JSX tags: `>Salvar<`, ignoring `{expressions}` and whitespace. */
const JSX_TEXT = /(?<!=)>([^<>{}]*[A-Za-zÀ-ú][^<>{}]*)</g;
const ATTRIBUTE =
  /\b(aria-label|aria-description|title|placeholder|label|alt|what|failure|lead|hint|aside)="([^"]*[A-Za-zÀ-ú][^"]*)"/g;

type Finding = { file: string; line: number; text: string };

function scan(file: string, source: string): Finding[] {
  const code = stripComments(source);
  const lineOf = (index: number) => code.slice(0, index).split('\n').length;
  const findings: Finding[] = [];
  for (const match of code.matchAll(LITERAL)) {
    const text = match[1] ?? match[2] ?? match[3] ?? '';
    if (ACCENTED.test(text)) findings.push({ file, line: lineOf(match.index), text });
  }
  if (file.endsWith('.tsx')) {
    for (const match of code.matchAll(JSX_TEXT)) {
      const text = (match[1] ?? '').trim();
      // Generics and comparisons can look like tags (`useState<number | null>(null) … a < b`).
      if (!text || /[=;()&|]/.test(text) || text.startsWith(',')) continue;
      findings.push({ file, line: lineOf(match.index), text });
    }
    for (const match of code.matchAll(ATTRIBUTE)) {
      findings.push({ file, line: lineOf(match.index), text: match[2] ?? '' });
    }
  }
  return findings.filter(
    (finding) =>
      !ALLOWED.some(
        (allowed) =>
          (allowed.file === '' || finding.file === allowed.file) && allowed.text.test(finding.text),
      ),
  );
}

describe('sem texto fixo fora do catálogo', () => {
  it('nenhum texto visível em JSX, atributo de acessibilidade ou literal com acento', () => {
    const findings = files(SRC)
      .map((path) => relative(SRC, path).split(sep).join('/'))
      .filter((file) => !SKIPPED.some((pattern) => pattern.test(file)))
      .flatMap((file) => scan(file, readFileSync(join(SRC, file), 'utf8')));
    expect(findings.map((f) => `${f.file}:${f.line} ${JSON.stringify(f.text)}`)).toEqual([]);
  });

  it('a varredura pega os casos que deve pegar', () => {
    const sample = [
      '<button aria-label="Fechar"><X /></button>',
      '<p>Nenhum lançamento</p>',
      "toast.success('Conta lançada');",
      "const ok = t('web.app.description'); // Comentário com acentuação é ignorado",
    ].join('\n');
    expect(scan('sample.tsx', sample).map((f) => f.text)).toEqual([
      'Conta lançada',
      'Nenhum lançamento',
      'Fechar',
    ]);
  });
});
