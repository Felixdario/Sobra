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

## ADR-003 — Linker do pnpm: `nodeLinker: hoisted`

- **Data:** 2026-11-04
- **Contexto:** a documentação do Expo (guia "Work with monorepos") diz que, a partir do SDK 54, o Expo suporta o layout isolado padrão do pnpm, mas recomenda `nodeLinker: hoisted` em `pnpm-workspace.yaml` quando aparecem erros de resolução ou build em bibliotecas React Native. Ao testar o layout isolado aqui, o Vitest falhou com `ERR_PACKAGE_IMPORT_NOT_DEFINED` (`#module-evaluator`). A causa é o Node 22.14 no Windows: ele não lê o campo `imports` de um `package.json` cujo caminho passa de cerca de 260 caracteres (reproduzido isoladamente). Com a pasta do repositório (cerca de 180 caracteres) mais `node_modules/.pnpm/<hash>/node_modules/<pkg>`, o limite estoura. `virtualStoreDirMaxLength` não reduz o suficiente.
- **Decisão:** `nodeLinker: hoisted` em `pnpm-workspace.yaml` (no pnpm 10 as configurações ficam lá, não no `.npmrc`; por isso não existe `.npmrc`).
- **Porquê:** é a alternativa que o próprio Expo documenta, evita os caminhos longos no Windows e funcionou nos quatro workspaces (`expo export -p android` também gerou o bundle). O custo é perder a rigidez do layout isolado (dá para importar sem querer um pacote que não está declarado). Revisar quando o repositório estiver num caminho curto ou o Node local for atualizado.

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
