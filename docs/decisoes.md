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

## ADR-010 — Prisma 7 com SQLite via driver adapter; PostgreSQL é troca de provider

- **Data:** 2026-11-04
- **Contexto:** a API precisa de um ORM com migrations e troca barata para PostgreSQL (ADR-002). No npm, `prisma@latest` aponta para `8.0.0-rc.30` (um release candidate), enquanto `@prisma/client@latest` é `7.10.1`.
- **Decisão:**
  - **Prisma 7.10.1** fixo (CLI e client na mesma versão; nada de RC). Gerador `prisma-client` (ESM, TypeScript gerado em `apps/api/src/generated/prisma`, ignorado pelo git e gerado no `postinstall` da API). Configuração em `apps/api/prisma.config.ts`, que lê `apps/api/.env` com `process.loadEnvFile`.
  - **SQLite pelo driver adapter `@prisma/adapter-better-sqlite3`**, o caminho padrão do Prisma 7 (sem engine Rust de query). O `better-sqlite3` baixa binário pré-compilado no install; por isso ele, `prisma` e `@prisma/engines` estão em `onlyBuiltDependencies` do `pnpm-workspace.yaml`.
  - **Enums do Prisma** (`AccountType`, `CategoryKind`, `TransactionType`, `RecurrenceFrequency`): suportados no SQLite desde o Prisma 6.2 (viram `TEXT`) e nativos no PostgreSQL. `icon` e `color` ficam `String`, porque a lista `ICON_NAMES` do shared pode crescer sem migration.
  - **IDs `@default(uuid(7))`**, como decidido na ADR-009.
  - **Todos os modelos do domínio já existem** (User, RefreshToken, Account, Category, Transaction, Budget, RecurringRule com o template embutido, ImportBatch), cada tabela de domínio com `userId` e índices por `userId` e `(userId, date)`. As relações com conta e categoria usam FK composta `(id, userId)` → `Account(id, userId)`, então o próprio banco recusa uma transação, orçamento ou recorrência que aponte para dado de outro usuário. Essas FKs são `onDelete: NoAction`; quem decide apagar ou arquivar é o service. `Transaction` tem `@@unique([recurringRuleId, date])` para a geração de recorrências ser idempotente.
  - **Dinheiro em `BigInt`** (centavos): `Account.initialBalance`, `Transaction.amount`, `Budget.amount` e `RecurringRule.amount` são `BIGINT` no SQLite e no PostgreSQL. O produto precisa aceitar R$ 1.000.000.000,00 (100.000.000.000 centavos) e somas maiores; `int4` no PostgreSQL pararia em R$ 21.474.836,47. O limite real é o do contrato: `z.int()` só aceita inteiros seguros (até 2^53 − 1), sem `.max()` extra no shared. O Prisma devolve `bigint`, então a conversão fica num lugar só, `apps/api/src/lib/money.ts`: `toDbCents(Cents) → bigint` na escrita, `fromDbCents(bigint) → Cents` na leitura (lança `RangeError` se passar do inteiro seguro, em vez de perder precisão) e `sumOrZero` para o `_sum` de `aggregate`/`groupBy` (`bigint | null`). As somas acontecem em `bigint` e só o resultado final vira `Cents`. Nenhum service usa `Number(...)` direto. O erro P2020 (valor fora da faixa) continua mapeado para 400 como defesa.
  - **PostgreSQL:** o `provider` do datasource não aceita variável de ambiente no Prisma, e migrations são específicas do banco (`migration_lock.toml`). Trocar é: `provider = "postgresql"`, `@prisma/adapter-pg` no lugar do adapter SQLite em `src/lib/db.ts`, `DATABASE_URL` do `docker-compose.yml` e uma pasta de migrations gerada do zero com `prisma migrate dev`. O schema não usa nada exclusivo do SQLite.
- **Porquê:** SQLite mantém `pnpm install && pnpm test` funcionando sem serviço externo. Fixar a 7.10.1 evita um RC marcado como `latest`. As FKs compostas transformam o isolamento entre usuários em regra do banco, não só disciplina do código.

## ADR-011 — Data da transação como texto `YYYY-MM-DD`

- **Data:** 2026-11-04
- **Contexto:** a transação acontece num dia do calendário de São Paulo (ADR-007), não num instante. `DateTime` do Prisma vira `DATETIME` no SQLite e `timestamp(3)` no PostgreSQL, sempre lido como instante UTC em JS; uma compra de 30/11 gravada como meia-noite UTC aparece como 29/11 em São Paulo.
- **Decisão:** `Transaction.date`, `RecurringRule.startDate/endDate/nextOccurrence` são `String` com `"YYYY-MM-DD"` (o mesmo formato de `localDateSchema`), e `Budget.month` é `"YYYY-MM"` (`MonthKey`). Filtro de mês: `date >= 'AAAA-MM-01' AND date < '<mês seguinte>-01'`; ordenação e índice `(userId, date)` funcionam por ordem lexicográfica. `createdAt`/`updatedAt` continuam `DateTime` (são instantes).
- **Porquê:** o valor no banco é exatamente o do contrato, sem conversão de fuso em lugar nenhum, e se comporta igual em SQLite e PostgreSQL. O tipo `DATE` do PostgreSQL seria mais rígido, mas o Prisma o devolve como `Date` à meia-noite UTC e traria de volta o risco de deslocamento; a validação de data existente já acontece no `localDateSchema` antes de gravar.

## ADR-012 — Sessão: JWT de acesso curto + refresh token opaco com rotação e detecção de reuso

- **Data:** 2026-11-04
- **Decisão:**
  - **Access token:** JWT HS256 (`@fastify/jwt`) com `sub = userId`, validade de 15 min (`ACCESS_TOKEN_TTL_SECONDS`). Não fica no banco.
  - **Refresh token:** 32 bytes aleatórios em base64url, opaco. O banco guarda só o **SHA-256** (`tokenHash` único), `expiresAt` (30 dias), `revokedAt`, `familyId` e `replacedById`. Hash rápido é suficiente porque o token tem 256 bits de entropia (argon2 só faz sentido para senhas).
  - **Rotação:** cada `/auth/refresh` revoga o token apresentado (update condicional `revokedAt IS NULL`, o que também resolve duas trocas simultâneas) e emite outro na mesma família.
  - **Reuso:** apresentar um token já revogado revoga **toda a família** (todas as renovações daquele login) e responde 401. Outros logins do mesmo usuário (outras famílias) seguem válidos.
  - **Logout** recebe o refresh token, revoga a família e responde 204 sempre (idempotente, não revela se o token existia).
  - Login com e-mail inexistente roda uma verificação argon2 contra um hash fictício, para o tempo de resposta não denunciar quais e-mails existem. A mensagem é a mesma nos dois casos.
- **Porquê:** é o desenho recomendado pela OAuth 2.0 Security BCP para clientes públicos (web e mobile): um refresh token vazado só pode ser usado uma vez antes de derrubar a sessão. Token opaco permite revogar no servidor; o JWT curto evita ir ao banco em toda requisição.

## ADR-013 — `@node-rs/argon2` para hash de senha

- **Data:** 2026-11-04
- **Decisão:** `@node-rs/argon2` (argon2id com os padrões da lib: 19 MiB, 2 iterações, paralelismo 1, que são os mínimos recomendados pela OWASP).
- **Porquê:** é distribuído como binários N-API pré-compilados em `optionalDependencies` por plataforma (inclusive `win32-x64-msvc`), sem script de instalação, sem node-gyp e sem toolchain C++. O pacote `argon2` depende de `node-gyp-build` no install, que no pnpm 10 exigiria liberar o script e, sem binário compatível, compilar localmente.

## ADR-014 — OpenAPI com `@fastify/swagger` + Swagger UI em `/docs`, gerado dos schemas Zod

- **Data:** 2026-11-04
- **Decisão:**
  - `fastify-type-provider-zod` 7 valida a entrada com os schemas do shared e gera o OpenAPI 3.1 (`/docs/json`) pelo `jsonSchemaTransform`. Schemas registrados no `z.globalRegistry` com `id` viram componentes (`Account`, `Category`, `ApiError`); exemplos entram com `.meta({ examples })` na API, sem tocar no shared.
  - **Serializer próprio** (`src/plugins/zod.ts`): a versão 7 serializa com `z.encode`, que lança erro em `.transform()` de mão única, e os schemas do shared usam transform (centavos, cor, mês). O nosso faz `safeParse` com o schema de resposta: valida o contrato, remove campos extras e aplica as transformações (que são idempotentes). Resposta fora do contrato vira 500 e é logada.
  - UI: **Swagger UI** (`@fastify/swagger-ui`) em `/docs`, com esquema `bearerAuth` e `persistAuthorization`.
- **Porquê:** Swagger UI é servido localmente pelo plugin oficial, sem CDN, e o botão "Authorize" resolve o fluxo de testar rotas protegidas. O Scalar tem visual melhor, mas carrega o bundle de um CDN por padrão; para uma API de portfólio rodando offline, o oficial é o mais previsível.

## ADR-015 — Transferências fora de receitas e despesas nos resumos

- **Data:** 2026-11-04
- **Decisão:** receitas são as transações `income` e despesas as `expense`; `transfer` nunca entra nelas (resumo do mês, série receitas × despesas, gastos por categoria, orçamentos). Transferências só afetam saldo: no saldo total, uma transferência entre duas contas do escopo se anula (sai de uma, entra na outra); para uma conta fora do escopo (arquivada, ou outra conta quando há `accountId`) ela conta como saída/entrada. Receitas e despesas consideram todas as contas do usuário (inclusive arquivadas, porque o fato aconteceu), enquanto o saldo total soma só as contas não arquivadas. Taxa de poupança e variações percentuais usam `percentOf` (escala 0–100) e são `null` quando a base é zero; a base da variação é o valor absoluto do mês anterior, para o sinal indicar a direção mesmo com saldo negativo.
- **Porquê:** transferir para a poupança não é gastar nem ganhar; contar a transferência inflaria as duas pontas e distorceria a taxa de poupança.

## ADR-016 — Cálculo do histórico de saldo

- **Data:** 2026-11-04
- **Decisão:** `GET /summary/balance-history` parte do saldo de abertura (saldos iniciais das contas do escopo + movimento líquido de todas as datas anteriores a `from`, via `accountMovements(..., { before })`) e soma o movimento líquido de cada dia (`groupBy` por `date`+`type` nas saídas e por `date` nas transferências recebidas). Dias ou meses sem movimento repetem o valor anterior; no modo mensal, o ponto é o saldo no fim do mês. O escopo é o conjunto **atual** de contas não arquivadas (ou a conta de `accountId`), aplicado a todo o histórico. Limite: 120 meses no modo mensal, 12 no diário (400 acima disso). A série receitas × despesas também agrupa por dia e acumula por mês em memória, porque o `groupBy` do Prisma não agrupa por `substr(date)`.
- **Porquê:** são no máximo 3 consultas agregadas, com linhas limitadas pelo número de dias do período, não pelo de transações, e sem SQL cru (portável para PostgreSQL). Usar o conjunto atual de contas mantém o último ponto igual ao saldo total exibido no painel.

## ADR-017 — Recorrências materializadas sob demanda, de forma idempotente

- **Data:** 2026-11-04
- **Decisão:**
  - Uma `RecurringRule` guarda a regra e o modelo da transação. As ocorrências viram transações reais (`recurringRuleId` + `date`) quando ficam devidas: `syncDueRecurring(db, userId, today)` gera tudo de `nextOccurrence` até hoje (fuso de São Paulo) e avança `nextOccurrence`. Roda em `POST /recurring/sync` e no início de `GET /transactions`; não há job agendado.
  - Idempotência pelo `@@unique([recurringRuleId, date])`: datas já existentes são puladas e um insert concorrente que perde a corrida (P2002) é ignorado. Rodar duas vezes, ou com `nextOccurrence` atrasado, não duplica.
  - As datas vêm de uma função pura (`nextOccurrences(rule, from, until)` em `recurring/schedule.ts`) que calcula a n-ésima ocorrência sempre a partir da data inicial: mensal no dia 31 cai no último dia dos meses curtos sem "encolher" os seguintes (31/01 → 28/02 → 31/03); anual em 29/02 cai em 28/02 nos anos não bissextos; semanal soma `7 × interval` dias. Sem `dayOfMonth`, vale o dia da data inicial.
  - Editar a regra vale para as próximas ocorrências (recomeça depois da última gerada); as já geradas ficam como estão. Pausar e reativar não gera o período pausado. Excluir a regra mantém as transações (FK com `SetNull`). Regras de conta arquivada esperam a conta ser restaurada.
- **Porquê:** transações reais entram em saldos, resumos, orçamentos e filtros sem nenhum caso especial, e o usuário pode editar ou excluir uma ocorrência isolada. Gerar sob demanda dispensa infraestrutura de agendamento (a API pode ficar parada dias) e o custo é uma consulta indexada (`userId, active, nextOccurrence`) por listagem.

## ADR-018 — Importação de CSV: texto em JSON, papaparse e prévia antes de gravar

- **Data:** 2026-11-04
- **Decisão:**
  - Fluxo em dois passos: `POST /imports/csv/preview` não grava nada e devolve cada linha validada, com categoria sugerida e marca de duplicata; o cliente revisa (escolhe categorias, remove linhas) e manda `POST /imports/csv/commit` com as linhas mapeadas. O commit cria o `ImportBatch` e as transações numa única `$transaction` (tudo ou nada) e pula duplicatas, a menos que `force: true`. `DELETE /imports/:id` desfaz a importação.
  - **Formato do envio: JSON `{ accountId, csv, fileName? }`**, não multipart. O arquivo de extrato é pequeno (limite de 2000 linhas, corpo até 4 MiB na rota), o navegador e o app leem o texto com `File.text()`, e assim a rota usa a mesma validação Zod, o mesmo error handler e aparece completa no `/docs`, sem `@fastify/multipart` e sem lidar com streams/arquivos temporários. Também aceita `{ accountId, rows }` (o contrato do shared), para quem já separa as colunas no cliente.
  - **Biblioteca: `papaparse`.** Sem dependências, madura, trata aspas, quebras de linha em campo e BOM, e roda também no navegador (o front pode reutilizar). O separador é decidido por nós (`;` se a primeira linha tiver, depois tabulação, depois vírgula), porque a adivinhação genérica confunde a vírgula decimal do real com separador.
  - Cabeçalho: a primeira linha é cabeçalho se nenhuma célula for data ou valor; colunas pelos nomes (data, descrição/histórico/lançamento, valor; "saldo" é ignorado) ou, sem cabeçalho, pelo conteúdo. Datas `DD/MM/AAAA` ou `AAAA-MM-DD`; valores por `parseBRL` (negativo = despesa), aceitando também ponto decimal com 1–2 casas ("-12.34"), que não pode ser milhar.
  - Duplicata: mesma conta, data, tipo, valor e descrição normalizada (maiúsculas, sem acentos, espaços colapsados). Cada transação existente "absorve" uma linha só, então duas compras iguais no arquivo contra uma já lançada deixam uma como nova.
  - Categoria sugerida por palavras-chave na descrição normalizada (MERCADO/SUPERMERC → Mercado, UBER/99 → Transporte, NETFLIX/SPOTIFY → Assinaturas…), procurando uma categoria do usuário com aquele nome e o tipo da linha; sem correspondência, `null`.
- **Porquê:** a prévia evita lixo no banco e permite revisar categoria e duplicatas; regras simples e explicáveis bastam para um extrato pessoal e são fáceis de estender.

## ADR-019 — Ajustes de contrato para os clientes e seed determinístico do usuário demo

- **Data:** 2026-11-04
- **Contexto:** antes de web e mobile consumirem a API, revisamos o contrato do ponto de vista de quem desenha as telas. Também faltavam dados para o painel e os gráficos fazerem sentido numa demonstração.
- **Decisão (contrato, em `@financas/shared`):**
  - **Transação com campos de exibição:** a resposta traz `account: { id, name }`, `category: { id, name, color, icon } | null` (nulo em transferências) e `toAccount: { id, name } | null` (nulo em receitas e despesas), além dos ids. A API carrega tudo com um `include` na mesma consulta da transação, sem uma consulta por item. Assim a lista de transações não precisa buscar contas e categorias à parte nem montar mapas no cliente.
  - **Percentuais na escala 0–100** em todo o contrato (`savingsRate`, `delta.*.percent`, `percent` de gastos por categoria, `percentUsed` de orçado × realizado), como já devolvia `percentOf`. Fica documentado no JSDoc de `percentSchema`; os exemplos do shared que usavam fração foram corrigidos.
  - **`balance` só para saldo de verdade:** na série receitas × despesas o resultado do mês passou a se chamar `net` (receitas − despesas). `balance` continua no resumo do mês e no histórico de saldo, onde é saldo de contas.
  - **Importação inteira no shared:** prévia aceita `{ accountId, csv, fileName? }` ou `{ accountId, rows }`; as células brutas podem vir vazias (a prévia marca "Coluna … vazia" na linha em vez de recusar a requisição, e o marcador interno "(vazio)" deixou de existir); o commit tem `force` (padrão `false`) e `fileName`; o resultado traz `batchId`; `importBatchSchema` descreve o lote. `recurringSyncResultSchema` (`{ created }`) e `budgetCopySchema` também saíram da API. A API usa os schemas do shared direto, sem `.extend`/`.merge` locais.
- **Decisão (seed):**
  - `prisma db seed` roda `prisma/seed.ts`, que chama `seedDemo` (`src/seed/demo.ts`). No Prisma 7 o `migrate reset` não semeia sozinho, por isso `db:reset` encadeia `prisma db seed`.
  - O demo (`demo@financas.dev` / `demo1234`) é criado por `createUserWithDefaults`, a mesma função do cadastro (categorias padrão e "Carteira"), com senha em argon2. Rodar de novo apaga só os dados desse usuário e recria tudo numa única transação.
  - Seis meses até o mês de referência (hoje em São Paulo, ou `SEED_TODAY=AAAA-MM-DD`), com o mês atual só até hoje. Os valores vêm de um PRNG `mulberry32` com semente fixa, escrito no projeto (cerca de 10 linhas, sem dependência). Os sorteios acontecem sempre na mesma ordem, inclusive para datas futuras que depois são descartadas, então a mesma data de referência gera exatamente os mesmos dados.
  - Assinaturas e aluguel são `RecurringRule` reais, materializadas por `syncDueRecurring`. A fatura do cartão é paga no dia 15 por transferência da corrente, no valor das despesas do cartão no mês anterior. O rendimento da poupança entra no dia 1º, o que garante receita em todos os meses, inclusive no mês atual antes do salário. Para cada mês completo é sorteada uma taxa de poupança-alvo entre 5% e 25% (espalhadas entre os meses); depois de gerar os lançamentos, o seed ajusta com uma compra ou um freelance para chegar ao alvo.
- **Porquê:** os campos embutidos evitam N+1 no cliente com custo de um join. Uma escala única de percentual evita a classe de bug "mostrou 0,3%" e o nome `net` deixa claro que não é saldo. Com a importação no shared, web e mobile validam o mesmo formato que a API aceita. O seed determinístico deixa demonstrações e capturas de tela reproduzíveis e permite testar o próprio seed pela API.

## ADR-020 — Nome do produto: Sobra

- **Data:** 2026-11-04
- **Contexto:** o app se chamava provisoriamente "Finanças", que é a categoria, não uma marca. O projeto é de portfólio e precisa de um nome curto, pt-BR, que funcione na interface e não colida com bancos ou apps conhecidos.
- **Opções:**
  - **Sobra** — a pergunta que o produto responde todo mês: quanto sobra. Funciona como substantivo e verbo na própria interface ("Sobraram R$ 1.081,55").
  - **Folga** — o estado desejado do orçamento ("orçamento folgado"); fora de contexto lê como "dia de folga".
  - **Fôlego** — a sensação de ter margem; o circunflexo atrapalha domínio, bundle id e busca.
  - Descartado na triagem: **Trocado** (colide com Meu Trocado, Trocados Carteira e o Trocadinho do Oinc).
- **Decisão:** **Sobra**. `APP_NAME = 'Sobra'` em `packages/shared/src/config.ts`; título do web, nome do app Expo e título da pilha atualizados. `slug` e `scheme` do Expo continuam `financas` (identificadores técnicos; trocar exige decidir bundle id e deep links).
- **Verificação:** busca web rápida (nov/2026) não achou banco ou app de finanças chamado Sobra, Folga ou Fôlego no Brasil; existe "Vai Sobrar" (Product Hunt, pequeno), nome próximo mas não idêntico. Não houve consulta ao INPI — fazer antes de qualquer uso comercial.
- **Porquê:** o nome é o mecanismo do produto (receitas − despesas, taxa de poupança) e vira linguagem da interface, sem precisar de slogan.

## ADR-021 — Direção visual "Concreto e azulejo" e tipografia Archivo

- **Data:** 2026-11-04
- **Contexto:** o dono quer qualidade de portfólio e um visual que não pareça gerado por IA (sem gradiente roxo, glassmorphism, cards idênticos com ícone em círculo, emoji, Inter em tudo). A direção foi definida com as skills `impeccable` (init/shape/new-work, modo Operate), `design-taste-frontend` (fluxo de telas de app) e `dataviz` (validação de paleta).
- **Decisão:**
  - **Mundo:** concretismo e identidade modernista brasileira + concreto aparente + azulejo cobalto de Athos Bulcão. Empresta só tipografia, paleta, densidade e um gesto assinatura; navegação e controles são os padrões de cada plataforma. Sorteio do impeccable `seed:ba8f5bcef7295068` (índice 5 da lista própria); estilo do taste `achromatic-ledger` (semente 486094911).
  - **Desafiantes do sorteio** (todos recusados nos dois eixos; disciplina doada entre parênteses): espécime bitmap Emigre (uma família só, hierarquia por tamanho e peso), labanotação (comprimento = valor exato: toda barra é proporcional, sem largura mínima disfarçada), capa Factory/Saville (nada rotulado duas vezes: a cor da categoria aparece uma vez por linha), parede de streaming (o item em foco destaca, o resto recua — hover em gráfico esmaece as outras séries), sinalização amarela de aeroporto (uma cor reservada para um trabalho só: cobalto só para dado principal, link, foco e seleção), espécime de fonte variável (contraste de escala como hierarquia: o número é o maior texto da tela).
  - **Cor:** chão de concreto (`#F1F1EE` / `#141413`), tinta, um único matiz (cobalto `#1C50B5`) no dado principal; verde só entrada, vermelho só dívida/estouro, ocre só "perto do limite". Despesa comum em tinta, com sinal.
  - **Assinatura:** a régua do mês — a receita como uma barra, despesas em planos chapados de tinta, a sobra como plano cobalto nomeado.
  - **Tipografia:** uma família, **Archivo** 400/500/600 (Omnibus-Type, OFL), Google Fonts no web e `@expo-google-fonts/archivo` no mobile; algarismos tabulares sempre. Substitui a Geist sorteada pelo taste: Geist/Inter são justamente o "kit" que o estudo da skill e o dono rejeitam; Archivo tem algarismos de largura igual por padrão (medido), cobre pt-BR e tem pesos estáticos no expo-google-fonts.
  - **Paleta de dados:** cobalto, ocre, céu, rosa, oliva, nessa ordem, por busca exaustiva de ordenação e `validate_palette.js` (pior par vizinho com daltonismo ΔE 13,2 claro / 12,6 escuro; visão típica 24,2 / 24,5).
- **Porquê:** a direção sai do mundo da usuária e do nome (o que sobra), não da categoria "fintech"; a disciplina de cor deixa o dinheiro como protagonista e a acessibilidade é testada, não declarada.
- **Em aberto:** cores padrão das categorias (`DEFAULT_CATEGORIES` na API) são da paleta Tailwind; como a cor da categoria só aparece como quadradinho de identidade, não bloqueia, mas vale trocar por um conjunto curado (decisão do Planejador).

## ADR-022 — Tokens compartilhados em `@financas/tokens` (TS puro)

- **Data:** 2026-11-04
- **Contexto:** web (React + Vite) e mobile (Expo/RN) precisam dos mesmos valores de cor, tipo, espaço e movimento, cada um no seu formato (CSS custom properties × objetos de `StyleSheet`), sem um depender do runtime do outro.
- **Decisão:**
  - Pacote `packages/tokens`, consumido como fonte TypeScript (como o shared, ADR-005), **sem dependência de DOM nem de React Native** (`lib: ES2023`, `types: []` no tsconfig de `src`). Testes e scripts têm um tsconfig separado com tipos de Node.
  - Camadas: primitivas (`concreto`, `cobalto`, `verde`, `vermelho`, `ocre`, `dataHues`) → tema semântico (`lightTheme`, `darkTheme`: `bg`, `text`, `border`, `action`, `money`, `status`, `budget`, `chart`) → escalas independentes de tema (tipografia, espaço, raios, elevação, movimento, breakpoints, alvos de toque). Componentes leem só o semântico.
  - Formatos neutros que os dois lados convertem: sombra como `{offsetX, offsetY, blur, spread, color, opacity, androidElevation}`; tracking em `em`; curvas como tuplas `cubic-bezier`; molas no formato do `withSpring` do Reanimated.
  - Web: `toCssVariables(theme, selector?)` gera um bloco de variáveis; `toCssStylesheet()` gera claro + escuro por `prefers-color-scheme` + `data-theme` forçado. Mobile: `createNativeTheme(mode)` devolve cores, espaços em número, estilos de texto com `fontFamily` por peso (`Archivo_600SemiBold`), `letterSpacing` em px e `fontVariant` tabular, sombras iOS/Android e molas.
  - Testes Vitest: fórmula WCAG implementada e checada contra valores conhecidos; todos os pares texto/fundo permitidos com mínimo explícito (AA, AAA nos números principais, 3:1 para gráficos e bordas de campo) nos dois temas; paleta de dados com ΔE OKLab (Machado 2009) entre vizinhas; snapshot do CSS; `docs/design/tokens.html` precisa bater com o gerador.
  - Referência visual estática gerada por `corepack pnpm --filter @financas/tokens build:preview` (tsx, já presente no lockfile pela API). O HTML gerado está no `.prettierignore`.
- **Porquê:** uma fonte de verdade testável; os temas e a acessibilidade não regridem sem um teste vermelho, e nenhum cliente precisa conhecer o formato do outro.

## ADR-023 — Cliente da API compartilhado (`@financas/client`), refresh single-flight e onde guardar os tokens

- **Data:** 2026-11-04
- **Contexto:** web (React + Vite) e mobile (Expo) vão consumir a mesma API com TanStack Query. Sem um cliente comum, cada app reescreveria fetch, renovação de sessão, validação e chaves de cache, e os dois divergiriam justamente no ponto mais delicado: a rotação de refresh token com detecção de reuso (ADR-012).
- **Decisão:**
  - **Pacote `packages/client`**, TS puro (`lib: ES2023`, `types: []`), consumido como fonte (ADR-005). `fetch`, `AbortController` e timers vêm de `globalThis` com tipos estruturais mínimos, sem DOM nem RN. Duas entradas: `@financas/client` (`createApiClient`, `ApiError`, `TokenStore`; depende só de `@financas/shared` e `zod`) e `@financas/client/query` (chaves, `queryOptions`/`mutationOptions` prontos, otimista).
  - **`@tanstack/query-core` como peer opcional, só de tipos**, não `@tanstack/react-query`: o react-query reexporta o query-core, então as mesmas opções servem para `useQuery`/`useMutation` no web e no RN, e o pacote não depende de React (os testes rodam com `QueryClient`/`MutationObserver` do core, sem renderizar nada). As mutações pegam o `QueryClient` do `MutationFunctionContext` da v5, então `createMutations(api)` não recebe o cliente.
  - **Respostas validadas com os schemas de saída do shared** (os mesmos que a API usa para serializar). Resposta fora do contrato vira `ApiError` `INVALID_RESPONSE` com os issues do Zod, em vez de dado errado chegar à tela. Todo erro é `ApiError` (`status`, `code`, `message` pt-BR, `details`); os do cliente: `NETWORK_ERROR`, `TIMEOUT` (15 s por tentativa, configurável), `ABORTED`, `HTTP_ERROR`, `SESSION_EXPIRED`. `shouldRetry` repete só rede/timeout/5xx.
  - **Refresh single-flight:** num 401, a requisição chama `refreshSession(tokenUsado)`. Se já existe um refresh em andamento, espera o mesmo; se o token guardado já mudou (o 401 chegou depois de outro refresh), só repete com o novo; senão faz **um** `POST /auth/refresh`. Cada requisição repete no máximo uma vez. Motivo: dois refreshes com o mesmo token disparam a detecção de reuso e derrubam a família inteira (o teste de integração em `apps/api` comprova: sem o single-flight, três requisições concorrentes encerram a sessão).
  - **Quando a sessão acaba:** só quando a API **recusa** o refresh (400/401): `tokenStore.clear()`, `onSessionExpired()` (uma vez, mesmo com N requisições esperando) e `SESSION_EXPIRED` para todas. Falha de rede, timeout, 429 ou 5xx no refresh propaga o erro e **mantém** a sessão, porque o refresh token pode continuar válido; deslogar por causa de 3G ruim seria pior. Risco aceito: se o servidor rotacionou e a resposta se perdeu, o próximo refresh usa o token antigo, a API detecta reuso e a sessão cai (a usuária entra de novo).
  - **`TokenStore` assíncrono (`get/set/clear`)** recebendo o par inteiro. Um store que só persiste o refresh token devolve `accessToken: ''` depois de reiniciar, e o cliente renova antes da primeira chamada em vez de gastar um 401.
  - **Onde guardar os tokens:**
    - **Mobile:** `expo-secure-store` (Keychain no iOS, Keystore no Android), com o par serializado numa chave.
    - **Web (recomendado agora):** access token **só em memória** e refresh token no **`localStorage`**. Ressalvas: qualquer XSS lê o `localStorage` e leva um refresh token de 30 dias. Isso é mitigado (não eliminado) pela rotação com detecção de reuso (o roubo derruba a família no primeiro uso concorrente), por CSP sem `unsafe-inline` e por não usar HTML vindo do usuário. Abas compartilham o `localStorage` mas não a memória, então cada aba teria o próprio single-flight. Por isso o cliente aceita `refreshLock`, e o web passa `navigator.locks.request('sobra-refresh', run)`: um refresh por vez entre as abas, e a aba seguinte lê o token já rotacionado.
    - **Web (alternativa, não adotada agora): refresh em cookie `httpOnly; Secure; SameSite=Strict; Path=/auth`.** O JS deixa de ver o refresh token e o XSS não o exfiltra (ainda pode agir durante a sessão). Custo: a API passa a ler e escrever cookie em `/auth/refresh|login|register|logout` (com `@fastify/cookie`), mantendo o corpo para o mobile; CORS com `credentials: true` e origem exata; proteção CSRF em `/auth/refresh` (SameSite=Strict mais checagem de `Origin`); API e web no mesmo site (ou proxy do Vite em dev), senão o cookie de terceiro é bloqueado; o cliente ganha `credentials: 'include'` e um `TokenStore` web sem refresh. É a evolução indicada antes de um deploy público. Para um projeto de portfólio rodando local, o custo não compensa agora.
  - **Chaves e invalidações:** chaves `[domínio, tipo, params]` (`['transactions', 'list', filtros]`). Cada mutação invalida a raiz dos domínios afetados, numa tabela única (`invalidationMap`) testada: transação → transactions, accounts (saldo), summary, budgets. Categoria editada → também transactions/budgets/summary (nome e cor embutidos). Regra recorrente criada ou editada → também o "dinheiro", porque `GET /transactions` materializa ocorrências. Regra excluída → só recurring (as transações ficam). Login troca o cache pelo usuário novo; logout limpa.
  - **Otimista em transações** (lançar e deslizar para apagar): `onMutate` cancela leituras em andamento, tira um snapshot de `transactions` e `accounts`, insere/edita/remove nas listas em cache cujo filtro bate (espelho dos filtros da API; na ordem padrão o item novo entra por data) e ajusta o saldo das contas. `onError` restaura o snapshot, `onSuccess` troca o item `optimistic-N` pelo real e `onSettled` invalida tudo para o servidor ter a última palavra.
- **Porquê:** uma implementação testada da parte difícil (sessão, contrato, cache) em vez de duas; tipos que saem do shared, então uma mudança de contrato quebra o typecheck dos dois apps de uma vez.
- **Limites conhecidos:** duas mutações otimistas sobrepostas em que a primeira falha restauram o snapshot da primeira, desfazendo a segunda na tela até a invalidação corrigir (comportamento padrão do TanStack). Callbacks de tela devem ir em `mutate(vars, { onSuccess })`, porque passar `onSuccess` no `useMutation` substitui o do pacote.

## ADR-024 — Custo do argon2 por ambiente (`ARGON2_PROFILE`)

- **Data:** 2026-11-04
- **Contexto:** com os seis pacotes testando em paralelo na raiz, `beforeAll` da API (que registram usuários) passavam do `hookTimeout` de 10 s e pulavam 32 testes: cada cadastro e login faz um argon2id de 19 MiB.
- **Decisão:** `ARGON2_PROFILE` no env validado (`production` por padrão: argon2id `m=19456,t=2,p=1`, a recomendação OWASP e o padrão do `@node-rs/argon2`, agora explícito em `ARGON2_PROFILES`; `test`: `m=8,t=1,p=1`). `loadEnv` recusa `test` com `NODE_ENV=production`. O hasher (`createPasswordHasher`) entra no `AuthContext` e no `seedDemo`; `createTestApp` usa `test`. `verify` lê os parâmetros do próprio hash, então hashes de um perfil valem no outro. `hookTimeout: 30_000` no vitest da API fica só como rede de segurança. Um teste garante que produção usa o perfil forte.
- **Porquê:** a lentidão era do custo de hash, não dos testes; baixar o custo só na suíte resolve na causa (API de 28 s para cerca de 10 s na rodada da raiz) sem enfraquecer produção.
