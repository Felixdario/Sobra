import ts from 'typescript';

// The app has no Node types (it is React Native); Jest runs this file in Node, so the two
// modules it needs are typed here.
type Entry = { name: string; isDirectory(): boolean };
const { readdirSync, readFileSync, rmSync, writeFileSync } = jest.requireActual<{
  readdirSync(dir: string, options: { withFileTypes: true }): Entry[];
  readFileSync(file: string, encoding: 'utf8'): string;
  writeFileSync(file: string, data: string): void;
  rmSync(file: string): void;
}>('fs');
const { join, relative } = jest.requireActual<{
  join(...parts: string[]): string;
  relative(from: string, to: string): string;
}>('path');
declare const __dirname: string;

/*
 * Guard for the translation: no user-facing text may be written in the components. Every text a
 * person sees or hears (JSX text, labels, placeholders, accessibility labels and hints, toast
 * messages, announcements) has to come from the catalog via `t()`. The scan parses each source
 * file with the TypeScript compiler, so comments never count.
 */

const ROOT = join(__dirname, '..', '..');
const DIRS = ['app', 'src'];

/** Props whose value a person reads or hears. */
const TEXT_PROPS = new Set([
  'label',
  'title',
  'subtitle',
  'message',
  'placeholder',
  'accessibilityLabel',
  'accessibilityHint',
  'accessibilityValue',
  'aria-label',
]);
/** Object keys that end up on screen or in an announcement (toasts, options, actions). */
const TEXT_KEYS = new Set(['label', 'title', 'message', 'text']);
/** Functions whose string argument is spoken or shown. */
const TEXT_CALLS = new Set(['announce', 'announceForAccessibility', 'show']);

/** Accents of Portuguese and frequent words without accents: a pt-BR string anywhere is a leak. */
const PORTUGUESE =
  /[áàâãéêíóôõúüçÁÀÂÃÉÊÍÓÔÕÚÜÇ]|\b(?:de|do|da|em|para|sem|com|nenhum|nenhuma|conta|valor|salvar|lançar|gasto|receita|apagar|editar|buscar|carregando|tentar|ajustes|resumo|entrar|sair)\b/i;
const LETTER = /\p{L}/u;

/** Route names and paths are identifiers (Portuguese URLs), never shown as text. */
const ROUTE_PROPS = new Set(['name', 'href', 'anchor']);
const ROUTE_CALLS = new Set(['replace', 'push', 'navigate']);

function isRoute(node: ts.Node, source: ts.SourceFile): boolean {
  const parent = node.parent;
  if (ts.isJsxAttribute(parent)) return ROUTE_PROPS.has(parent.name.getText(source));
  if (ts.isPropertyAssignment(parent)) return ROUTE_PROPS.has(parent.name.getText(source));
  if (ts.isCallExpression(parent)) {
    return ROUTE_CALLS.has(parent.expression.getText(source).split('.').at(-1) ?? '');
  }
  return false;
}

/** Literals that are not language: brand name, units and symbols. */
const ALLOWED = new Set(['Sobra', '×', '→', '·']);

type Finding = { file: string; line: number; text: string; why: string };

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'test' ? [] : sourceFiles(path);
    if (!/\.tsx?$/.test(entry.name) || /\.test\.tsx?$/.test(entry.name)) return [];
    // The dev-only fake API (break-ui): its data and its error messages stand in for the
    // server, whose messages are pt-BR by contract (ADR-035) and get translated by `code`.
    if (/^scenario(s|Data)\.ts$/.test(entry.name)) return [];
    return [path];
  });
}

function textOf(node: ts.Node): string | null {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isTemplateExpression(node)) {
    return [node.head.text, ...node.templateSpans.map((span) => span.literal.text)].join(' ');
  }
  return null;
}

function isText(value: string | null): value is string {
  if (value === null) return false;
  const trimmed = value.trim();
  return trimmed !== '' && !ALLOWED.has(trimmed) && LETTER.test(trimmed);
}

function scan(file: string): Finding[] {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const findings: Finding[] = [];
  const report = (node: ts.Node, text: string, why: string) =>
    findings.push({
      file: relative(ROOT, file).replace(/\\/g, '/'),
      line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1,
      text: text.trim(),
      why,
    });

  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node) && isText(node.text)) report(node, node.text, 'JSX text');

    if (ts.isJsxAttribute(node) && TEXT_PROPS.has(node.name.getText(source)) && node.initializer) {
      const init = node.initializer;
      const value = ts.isJsxExpression(init) && init.expression ? init.expression : init;
      const text = textOf(value);
      if (isText(text)) report(node, text, `prop ${node.name.getText(source)}`);
    }

    if (
      ts.isPropertyAssignment(node) &&
      TEXT_KEYS.has(node.name.getText(source)) &&
      isText(textOf(node.initializer))
    ) {
      report(node, textOf(node.initializer) ?? '', `key ${node.name.getText(source)}`);
    }

    if (ts.isCallExpression(node)) {
      const name = node.expression.getText(source).split('.').at(-1) ?? '';
      if (TEXT_CALLS.has(name)) {
        for (const arg of node.arguments) {
          if (isText(textOf(arg))) report(arg, textOf(arg) ?? '', `${name}()`);
        }
      }
    }

    const literal = textOf(node);
    if (
      literal !== null &&
      PORTUGUESE.test(literal) &&
      !ts.isImportDeclaration(node.parent) &&
      !isRoute(node, source)
    ) {
      report(node, literal, 'pt-BR string');
    }

    ts.forEachChild(node, visit);
  };
  visit(source);
  return findings;
}

describe('textos fixos no app mobile', () => {
  const files = DIRS.flatMap((dir) => sourceFiles(join(ROOT, dir)));

  it('varre as telas, os componentes e as rotas', () => {
    expect(files.length).toBeGreaterThan(40);
    expect(files.some((file) => file.endsWith('SummaryScreen.tsx'))).toBe(true);
  });

  it('nenhum texto visível ou falado escrito à mão: tudo vem do catálogo', () => {
    const findings = files.flatMap(scan);
    expect(findings.map((f) => `${f.file}:${f.line} [${f.why}] ${f.text}`)).toEqual([]);
  });

  it('o próprio detector acha um literal em JSX, em prop de acessibilidade e em anúncio', () => {
    const sample = join(ROOT, 'src', 'i18n', '__literal_sample__.tsx');
    writeFileSync(
      sample,
      [
        "const a = <Text accessibilityLabel='Fechar'>Salvar</Text>;",
        'const b = <Button label={`Total ${x}`} />;',
        "announce('Saved');",
        "toast.show({ message: 'Done' });",
      ].join('\n'),
    );
    try {
      expect(scan(sample).map((f) => f.why)).toEqual(
        expect.arrayContaining([
          'JSX text',
          'prop accessibilityLabel',
          'prop label',
          'announce()',
          'key message',
        ]),
      );
    } finally {
      rmSync(sample);
    }
  });
});
