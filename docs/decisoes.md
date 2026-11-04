# Registro de decisões (ADR)

Formato curto: contexto, decisão e porquê. Decisões novas entram no fim do arquivo.

## ADR-001 — pnpm via Corepack

- **Data:** 2026-11-04
- **Contexto:** o pnpm não está instalado globalmente e a regra do projeto é não instalar nada global.
- **Decisão:** a versão fica fixada em `"packageManager": "pnpm@10.18.0"` no `package.json` raiz e todo comando roda como `corepack pnpm ...`. Os scripts recursivos da raiz também chamam `corepack pnpm -r ...`, porque `pnpm` não existe no PATH desta máquina. No CI roda `corepack enable` antes do install.
- **Porquê:** todo mundo (e o CI) usa exatamente a mesma versão do pnpm sem instalação global; o Corepack vem com o Node 22.

## ADR-002 — SQLite em desenvolvimento, PostgreSQL via Docker opcional

- **Data:** 2026-11-04
- **Contexto:** a máquina de desenvolvimento não tem Docker.
- **Decisão:** desenvolvimento e testes da API usam SQLite (arquivo local, ignorado pelo git via `*.db`). Um `docker-compose.yml` com PostgreSQL será adicionado na fase 2 para quem tiver Docker e para o ambiente de produção.
- **Porquê:** SQLite não exige serviço nenhum, então `pnpm install && pnpm test` funciona em qualquer máquina. O ORM (Prisma, fase 2) mantém a troca de provider barata.

## ADR-003 — Linker do pnpm: layout isolado (padrão)

- **Data:** 2026-11-04 (revisada no mesmo dia)
- **Contexto:** na primeira versão o repositório estava num caminho de cerca de 180 caracteres. Com o layout isolado, `node_modules/.pnpm/<hash>/node_modules/<pkg>` passava do limite de cerca de 260 caracteres do Node 22.14 no Windows e o Vitest falhava com `ERR_PACKAGE_IMPORT_NOT_DEFINED`. Por isso a primeira decisão foi `nodeLinker: hoisted`. O repositório depois foi movido para `C:Userseduarinancas`.
- **Decisão:** voltar ao layout isolado padrão do pnpm, sem `nodeLinker`. No pnpm 10 essas configurações ficam em `pnpm-workspace.yaml`, por isso não existe `.npmrc`.
- **Porquê:** o layout isolado impede importar um pacote que não está declarado no `package.json` do workspace. Desde o SDK 54 o Expo suporta esse layout. Na pasta nova passaram install, typecheck, lint, os testes dos 4 workspaces e `expo export -p android`. Se uma biblioteca React Native der erro de resolução, `nodeLinker: hoisted` é a saída documentada pelo Expo. Clonar o repositório num caminho muito longo no Windows traz o problema de volta, o que fica avisado no README.

## ADR-004 — TypeScript estrito e versão 6.0

- **Data:** 2026-11-04
- **Contexto:** o `latest` do npm é o TypeScript 7.0, mas o `typescript-eslint` 8.72 exige `>=4.8.4 <6.1.0`, e o template do Expo SDK 58 usa `~6.0.3`.
- **Decisão:** `typescript ~6.0.3` em todos os workspaces. `tsconfig.base.json` liga `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `isolatedModules`, `skipLibCheck` e `noEmit`, com `moduleResolution: Bundler` e `types: []` explícito (cada workspace declara os seus). O mobile estende `["../../tsconfig.base.json", "expo/tsconfig.base"]`: o Expo define ambiente e JSX, e as flags estritas são repetidas no tsconfig do app.
- **Porquê:** `exactOptionalPropertyTypes` foi mantido porque o typecheck do Expo/Expo Router passou com ele (com `skipLibCheck`). Se alguma biblioteca futura quebrar, a saída é desligar só no workspace afetado, não na base.

## ADR-005 — `@financas/shared` consumido como fonte TypeScript

- **Data:** 2026-11-04
- **Contexto:** os quatro workspaces precisam importar o pacote compartilhado.
- **Decisão:** `exports` aponta direto para `./src/index.ts`, sem etapa de build. Vite, Metro/Babel (jest-expo), tsx e Vitest transpilam a fonte.
- **Porquê:** sem build intermediário não existe `dist` desatualizado. Quando a API precisar de um build de produção em JS puro, avaliar um bundler (tsup/tsdown) na própria API.

## ADR-006 — Versões e ajustes de compatibilidade

- **Data:** 2026-11-04
- **Decisão e porquê:**
  - **ESLint 10** (flat config) em vez do 9: é a estável atual, e `typescript-eslint`, `eslint-plugin-react-hooks` 7 e `eslint-config-prettier` já a suportam. Uma única `eslint.config.js` na raiz, com regras de hooks para web e mobile e `react-refresh` só na web.
  - **React 19.3.0 fixo** na web e no mobile: o Expo SDK 58 trava o React em 19.3.0, e versões diferentes de React no mesmo monorepo hoisted causam duplicação.
  - **jsdom 29** em vez do 30: o jsdom 30 exige Node `^22.22.2` (o undici dele usa `zlib.createZstdDecompress`) e quebra no Node 22.14 local.
  - **Fastify:** a rota fica em `src/app.ts` (`buildApp`), e `src/server.ts` só sobe o servidor. Assim os testes usam `app.inject` sem abrir porta.
  - **Scripts de build ignorados** (`esbuild`, `@parcel/watcher`) em `ignoredBuiltDependencies`: os dois usam binários pré-compilados de dependências opcionais, e o postinstall do esbuild falha neste ambiente sem fazer falta.
  - **Expo:** o app foi montado à mão (template blank-typescript do SDK 58 mais Expo Router), sem Reanimated nem Gesture Handler. As versões nativas seguem `expo install --check`.
  - **CI:** Node pela `.nvmrc` (22), `corepack enable`, `pnpm install --frozen-lockfile`, depois format:check, lint, typecheck e test.
