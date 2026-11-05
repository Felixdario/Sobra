# @sobra/api

Fastify 5 + Prisma 7 (SQLite em dev/teste) + Zod 4 via `fastify-type-provider-zod`. Os schemas de
`@sobra/shared` são o contrato: validam a entrada, filtram a saída e geram o OpenAPI em `/docs`.

## Comandos (a partir da raiz)

Atalhos da raiz (ver o README principal): `corepack pnpm bootstrap` cria `apps/api/.env` a partir do
`.env.example` se não existir, roda `db:deploy` e `db:seed`; `corepack pnpm dev` sobe API e web
juntos. Os comandos por pacote:

```sh
corepack pnpm install                              # também roda `prisma generate` (postinstall)
corepack pnpm --filter @sobra/api db:migrate    # cria/aplica migrations no SQLite de dev
corepack pnpm --filter @sobra/api db:seed       # (re)cria o usuário demo
corepack pnpm --filter @sobra/api dev           # http://localhost:3333 · docs em /docs
corepack pnpm --filter @sobra/api test          # cada arquivo de teste usa um SQLite próprio
corepack pnpm --filter @sobra/api build && corepack pnpm --filter @sobra/api start
```

Outros: `db:deploy` (aplica migrations sem criar), `db:reset` (apaga e recria o banco de dev e roda
o seed), `db:generate`. Variáveis em `.env.example` (copie para `apps/api/.env`; tudo tem padrão em dev).

## Usuário demo

`db:reset` (ou só `db:seed`, num banco já migrado) cria **demo@sobra.dev / demo1234** ("Ana Demo")
com seis meses de dados até hoje: contas Nubank, Poupança Caixa, Cartão Inter e Carteira; salário,
freelance, aluguel, contas da casa, mercado, transporte, restaurantes, lazer e assinaturas (estas
como recorrências reais); transferências para a poupança e pagamento da fatura do cartão;
orçamentos de 7 categorias em todos os meses. Ao final o seed imprime transações, receitas,
despesas e taxa de poupança por mês, os saldos e o resumo do mês atual.

```sh
corepack pnpm --filter @sobra/api db:reset                      # banco novo + demo
corepack pnpm --filter @sobra/api db:seed                       # recria só o demo
SEED_TODAY=2026-11-04 corepack pnpm --filter @sobra/api db:seed # data de referência fixa
```

O seed é idempotente (apaga e recria só os dados do demo) e determinístico: PRNG com semente fixa,
então a mesma data de referência gera os mesmos lançamentos (ADR-019). O código fica em
`src/seed/demo.ts`; `src/seed/demo.test.ts` semeia um SQLite temporário e confere tudo pela API.

## Estrutura

```
prisma/schema.prisma        todos os modelos do domínio (não precisa mexer para novos módulos)
src/app.ts                  buildApp(): plugins + registro dos módulos
src/config/env.ts           env validado com Zod (app.config)
src/plugins/                prisma, auth (JWT + app.authenticate), errors, zod, swagger
src/lib/                    errors (AppError, notFound…), http (errorResponses, idParamsSchema), db, money
src/modules/<dominio>/      routes.ts (HTTP) · service.ts (regras + Prisma) · <dominio>.test.ts
src/test/helpers.ts         createTestApp, registerUser, authHeader, errorOf
src/seed/                   gerador do usuário demo (prisma/seed.ts é o ponto de entrada)
```

## Como adicionar um módulo (ex.: `transactions`)

1. **Service** — `src/modules/transactions/service.ts`, funções puras `(db: Db, userId, ...)`:
   - **Toda** consulta filtra por `userId`. Para ler/alterar um registro, carregue antes com
     `findFirst({ where: { id, userId } })` e lance `notFound('Transação não encontrada')` se não
     vier. Recurso de outro usuário é **404, nunca 403**.
   - Referências a outros recursos (conta, categoria) passam por `findOwnedAccount` /
     `findOwnedCategory` (exportados pelos módulos). O banco também barra: as FKs são
     compostas `(id, userId)`, então uma transação não aponta para conta de outro usuário.
   - Devolva o tipo de **saída** do shared (`Transaction`, `Cents`, datas `toISOString()`).
   - **Dinheiro no banco é `BigInt`** (centavos). Converta **só** via `src/lib/money.ts`:
     `toDbCents` ao gravar, `fromDbCents` ao ler (lança erro acima do inteiro seguro) e
     `sumOrZero` para o `_sum` de `aggregate`/`groupBy`. Some em `bigint` e converta só o
     resultado; nunca `Number(x)` solto.
   - `date` é `"YYYY-MM-DD"` (string) e mês é `"YYYY-MM"`; filtre mês com
     `date >= 'AAAA-MM-01' AND date < '<mês seguinte>-01'`.
   - Use `compact(input)` para mandar patches parciais ao Prisma e `Db` para aceitar tanto o
     client quanto um `tx` de `$transaction`.
   - Erros de negócio: `badRequest`, `conflict` (409, mensagem pt-BR), `notFound`, `unauthorized`
     de `src/lib/errors.ts`. O error handler converte para `{ error: { code, message, details } }`.
2. **Routes** — `routes.ts` exporta um `FastifyPluginAsyncZod`:
   ```ts
   export const transactionsRoutes: FastifyPluginAsyncZod = async (app) => {
     app.addHook('onRequest', app.authenticate); // define request.userId
     app.get(
       '',
       {
         schema: {
           tags: ['Transações'],
           security: bearerAuth,
           summary: '…',
           querystring: transactionFiltersSchema, // do shared
           response: { 200: paginated(transactionSchema), ...errorResponses(400, 401) },
         },
       },
       async (request) => service.list(app.prisma, request.userId, request.query),
     );
   };
   ```
   Use os schemas do shared direto em `body`/`querystring`/`params`/`response` — não reescreva
   validação na API. Para exemplos no `/docs`, `schema.meta({ examples: [...] })`. Para virar
   componente reutilizável: `z.globalRegistry.add(transactionSchema, { id: 'Transaction' })`.
3. **Registrar** em `src/app.ts`: `await app.register(transactionsRoutes, { prefix: '/transactions' })`
   e adicionar a tag em `src/plugins/swagger.ts`.
4. **Testes** — `transactions.test.ts` ao lado do módulo:
   ```ts
   let app: App;
   beforeAll(async () => {
     app = await createTestApp();
   });
   afterAll(async () => {
     await app.close();
   });
   const user = await registerUser(app); // já vem com categorias e "Carteira"
   await app.inject({ method: 'GET', url: '/transactions', headers: authHeader(user) });
   ```
   Cada arquivo tem banco próprio (cópia de um template migrado no `globalSetup`), então os
   arquivos rodam em paralelo. Inclua sempre um teste de isolamento: outro usuário recebe 404 em
   GET/PATCH/DELETE e não vê os itens na listagem.

## Convenções

- Rotas de coleção usam path `''` (vira `/transactions`, sem barra final).
- `204` responde `reply.code(204).send(null)` com `204: z.null()` no schema.
- Respostas passam pelo serializer, que faz `parse` com o schema de saída: campo a mais é
  removido e resposta fora do contrato vira 500 (logado), nunca vaza.
- Rate limit por rota: `config: { rateLimit: { max, timeWindow } }` (plugin registrado com
  `global: false`).
- Mudou `schema.prisma`? `db:migrate -- --name <nome>` e commite a pasta da migration.
