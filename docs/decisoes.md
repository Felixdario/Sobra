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

## ADR-007 — Datas com date-fns + @date-fns/tz, sempre no fuso de São Paulo

- **Data:** 2026-11-04
- **Contexto:** "mês" e "dia" de uma transação dependem do fuso. Às 23h30 de 30/11 em São Paulo já é 01/12 em UTC, então agrupar por UTC jogaria a compra no mês errado. API, web e mobile rodam em fusos diferentes (servidor em UTC, aparelho em qualquer fuso).
- **Decisão:** `date-fns` 4 + `@date-fns/tz` (`TZDate`) em `@financas/shared/src/date`, com o fuso fixo em `TIME_ZONE` (`America/Sao_Paulo`), nunca o fuso da máquina. Instantes trafegam como `Date`/ISO em UTC; mês vira `MonthKey` (`"YYYY-MM"`, tipo marcado) e dia vira `"YYYY-MM-DD"`. `monthRange` devolve `{ start, end }` com `end` exclusivo (meia-noite do dia 1 do mês seguinte em SP), para consultas `>= start AND < end`. Textos na tela usam `Intl.DateTimeFormat` pt-BR com `timeZone` explícito ("4 de nov. de 2026", "novembro de 2026"); o curto de gráfico ("nov/26") é montado à mão porque o Intl não tem esse formato.
- **Porquê:** `date-fns` é modular (só entra no bundle o que é importado) e funciona igual no Node, no navegador e no Hermes. O `@date-fns/tz` é o pacote oficial de fuso da v4 e usa os dados de fuso do próprio `Intl`, sem embutir base de fusos; por isso continua correto para datas antigas com horário de verão (até 2019). Luxon e Day.js foram descartados por serem maiores ou dependerem de plugins com estado global. `MonthKey` só aceita anos 1000–9999, porque o construtor de `Date` trata 0–99 como 1900–1999.

## ADR-008 — Dinheiro: parse por string e arredondamento half-even

- **Data:** 2026-11-04
- **Contexto:** dinheiro é sempre `Cents` (inteiro). Faltava decidir como entra o texto digitado, como se aplica uma porcentagem e como se formata sem passar por float.
- **Decisão:**
  - `parseBRL` lê o texto com regex e acumula os dígitos como inteiro, sem `parseFloat`/`Number(string)`. Aceita `R$`, espaços e NBSP, sinal antes ou depois de `R$` (`-`, `+` ou `−`), milhar com ponto em grupos de 3 e até 2 casas depois da vírgula. Devolve `null` para o resto, inclusive `"1234.56"`: em pt-BR `"1.234"` é mil, e aceitar ponto decimal tornaria a entrada ambígua. `reaisToCents` é a versão que lança erro, para seeds e testes; `centsToReais` faz o caminho inverso para preencher inputs (`123456` → `"1.234,56"`).
  - `formatBRL` monta a string decimal a partir dos dígitos (`"1234.56"`) e a entrega ao `Intl.NumberFormat`, que aceita string decimal exata. Não há divisão por 100.
  - `applyPercent` arredonda **meio para o par** (half-even). A porcentagem é lida pela sua representação decimal mais curta (`0.1` vale exatamente 1/10) e a conta roda em `BigInt`. `percentOf` devolve `null` quando o total é 0, para a tela mostrar "—" em vez de um 0% inventado.
  - `allocate` usa o método dos maiores restos com pesos inteiros: a soma das partes é sempre o total e a sobra vai para a parte com maior resto (em empate, a primeira).
- **Porquê:** half-even é a regra da ABNT NBR 5891 e não acumula viés quando muitos valores arredondados são somados (o half-up empurra todo meio centavo para cima). Para quem lê, a diferença só aparece no meio centavo exato. A conta em `BigInt` evita casos em que o float desfaz o empate: `375 * 4.4 / 100` dá `16.500000000000004` em float, que qualquer regra levaria a 17, quando o valor exato 16,5 vai para 16 no half-even.

## ADR-009 — Contrato de dados: IDs UUID, transações como união discriminada, mensagens em pt-BR

- **Data:** 2026-11-04
- **Contexto:** os schemas Zod de `packages/shared/src/schemas` são o contrato entre API, web e mobile. Precisávamos fixar o formato dos IDs (o Prisma vai usar o mesmo), a modelagem das transações (receita, despesa e transferência têm campos diferentes) e o idioma das mensagens de validação.
- **Decisão:**
  - **IDs são UUID** (`z.uuid()`), gerados pelo Prisma com `@default(uuid(7))`. O UUID v7 é ordenado no tempo, o que ajuda o índice; `z.uuid()` aceita qualquer versão do RFC 9562. Em vez de cuid: o PostgreSQL tem tipo nativo `uuid` (16 bytes), o cliente consegue gerar um ID com `crypto.randomUUID()` (útil para o mobile offline no futuro) e `z.cuid()` só confere um prefixo e um tamanho mínimo, o que é uma validação fraca.
  - **Transações são `z.discriminatedUnion('type', ...)`**: `income | expense` exigem `categoryId`; `transfer` exige `toAccountId` diferente de `accountId` e descarta qualquer `categoryId` enviado. O tipo inferido já vem estreitado por `type`. O **update** é um patch plano e parcial (cada campo validado sozinho, `notes: null` limpa) e a coerência fica em `mergeTransactionUpdate(atual, patch)`, que aplica o patch sobre o registro atual e valida o resultado com o schema de criação. Assim, trocar `expense` por `transfer` exige `toAccountId`, e voltar para `expense` exige `categoryId`, sem duplicar regras.
  - **Recorrências aceitam transferências** no template (mesma união, sem `date`), porque "guardar R$ 500 todo mês na poupança" é um caso comum e não custa nada a mais no schema.
  - **Senha: de 8 a 128 caracteres.** O hash usa argon2, que não trunca a entrada como o bcrypt (72 bytes). O teto de 128 existe só para impedir que uma senha gigante deixe o hash caro e vire um vetor de DoS.
  - **Mês:** `monthKeySchema` valida com `isMonthKey` de `src/date/month` e entrega o tipo marcado `MonthKey` (ADR-007). A regra do formato fica num lugar só.
  - **Mensagens:** toda regra de domínio tem mensagem própria em pt-BR no schema (valor em centavos, data inexistente, mesma conta etc.), então o texto não depende de configuração global. Para os erros genéricos do Zod (tipo errado, campo ausente) o pacote exporta `installZodPtBR()`, que chama `z.config(z.locales.ptBR())`; cada app chama uma vez no boot. Usamos `ptBR` e não `pt`, que segue o português europeu ("ficheiro", "registo").
- **Porquê:** `z.config` é global. Chamá-lo no import do pacote seria um efeito colateral escondido em quem só importa um tipo, por isso a ativação fica explícita em cada app. Dinheiro é sempre inteiro em centavos (`z.int()`, que também barra inteiros fora da faixa segura) e vira o tipo `Cents` na saída, assim como o mês vira `MonthKey`. Por isso os tipos exportados distinguem `z.infer` (saída) de `z.input` (entrada) quando os dois diferem.
