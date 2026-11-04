# Conversa da dupla

## Fase 0
🧭 → 🔧 (Executor A) Passo 1/1: esqueleto do monorepo (git, pnpm via corepack, 4 workspaces, ESLint/Prettier/Vitest/jest-expo, CI, docs/decisoes.md). Sem commit.
🔧 → 🧭 FEITO: 4 workspaces, 6 testes, CI, ADR-001..006. Discordou: ESLint 10 (estável), TS 6.0.3 / React 19.3.0 / jsdom 29 por compatibilidade, rota em app.ts. Risco: linker hoisted forçado pelo limite de ~260 caracteres de caminho no Windows.
🧭 Validação própria: install/typecheck/lint/test/format:check exit 0 (3+1+1+1 testes). Discordâncias aceitas.
🧭 ✅ APROVADO → commit 5bf5a90

## Mudança de pasta
🧭 Repo movido para C:\Users\eduar\financas; .git restaurado; linker isolado validado (testes + expo export) → ADR-003 revisada, commit ee51d73... (amend).

## Fase 1
🧭 Contrato criado: packages/shared/src/money/cents.ts (Cents branded).
🧭 → 🔧 (Executor A) Dinheiro + datas: parseBRL, formatBRL(Cents), allocate, percent; MonthKey, monthRange SP, formatações pt-BR; cobertura 100%; ADR-007/008.
🧭 → 🔧 (Executor B) Schemas Zod em src/schemas/**: common, auth, account, category, transaction (união discriminada), budget, recurring, csvImport, summary; testes; ADR de IDs/mensagens.
🔧 → 🧭 (B) FEITO: 9 domínios, 108 testes, ADR-009. Discordou: z.locales.ptBR (não pt), installZodPtBR() explícito em vez de z.config global, saldo inicial negativo em qualquer conta. Pendências de integração: barrel em index.ts, unificar MonthKey, chamar installZodPtBR nos apps.
🧭 Nota p/ revisão: senha max 72 justificada por bcrypt, mas o projeto usa argon2.
🔧 → 🧭 (A) FEITO: money (parse/format/arithmetic half-even BigInt), date (MonthKey branded, SP), config.ts, 245 testes, 100% cobertura, ADR-007/008.
🧭 Validação própria: test:coverage 100%, typecheck/lint/format/test ok; sonda: parseBRL ok exceto "1 2 3"→12300; allocate [334,333,333]; 02:30Z de 1/dez = 2026-11; transfer mesma conta rejeitada.
🧭 🔁 REVISAR (A): 1) rejeitar espaços fora de agrupamento de milhar; 2) teste "Hoje" com relógio fixo.
🧭 🔁 REVISAR (B): 1) unificar MonthKey com date/month; 2) senha max 128 (argon2, não bcrypt); 3) export schemas no index + mover healthResponseSchema.
🔧 → 🧭 (A) FEITO revisão: parseBRL rejeita espaços fora de milhar (+14 casos), testes de relógio com fake timers (incl. lastNMonths). 263 testes, 100%.
🔧 → 🧭 (B) FEITO revisão: MonthKey unificado, senha 128 (argon2), index.ts só reexports, healthResponseSchema em schemas/common.
🧭 Validação final própria: 263 testes shared + api/web/mobile, 100% money/date, typecheck/lint/format ok, ADR-001..009.
🧭 ✅ APROVADO (A e B, 2 rodadas cada) → commit fase 1

## Fase 2
Plano: 2a base (A, sequencial) → 2b rotas de domínio (transações/recorrências/CSV ‖ orçamentos/resumos) → 2c seed demo → validação + commit.
🧭 → 🔧 (Executor A) 2a: Prisma (todos os modelos), auth argon2+JWT+refresh rotativo, contas, categorias, erros pt-BR, /docs, testes de isolamento, README do padrão de módulo.
🔧 → 🧭 (A) FEITO 2a: Prisma 7.10.1 + better-sqlite3, todos os modelos, FK composta (id,userId), auth argon2id + refresh rotativo com família, contas/categorias, erros pt-BR, /docs OpenAPI 3.1, 46 testes, ADR-010..014.
🧭 Validação própria: tudo verde; sonda R$ 1 bi → 201 no SQLite. Risco: colunas Int = int4 no Postgres (máx R$ 21,4 mi).
🧭 🔁 REVISAR (A): colunas monetárias BigInt + conversão centralizada em lib/money + testes > 2^31.
🔧 → 🧭 (A) FEITO revisão: BigInt em 4 colunas, lib/money (toDbCents/fromDbCents/sumOrZero), 51 testes incl. somas > 2^31 e > MAX_SAFE → 400.
🧭 Validação própria: verde; migration com BIGINT. ✅ APROVADO 2a (2 rodadas).
🧭 → 🔧 (Executor B) 2b: transactions, recurring (+sync idempotente, nextOccurrences pura), imports CSV (preview/commit, fixture). Dono de app.ts e swagger.ts.
🧭 → 🔧 (Executor C) 2b: budgets (+copy), summary (month, income-vs-expense, spending-by-category, balance-history, budget-vs-actual). Não edita app.ts; reporta linhas de registro.
🔧 → 🧭 (C) FEITO: budgets (+copy), summary (5 endpoints, accountId opcional), lib/period, factories, with-routes, 23 testes, ADR-015/016. Discordou: escala de percentual 0–100 vs exemplo do shared em fração. Riscos: "balance" com dois significados; copy concorrente.
🧭 Pendente p/ integração: registrar budgets/summary em app.ts + tags (após B terminar); alinhar exemplo de percentual no shared.
🔧 → 🧭 (B) FEITO: transactions (filtros/busca acentuada/ordenação/paginação), recurring (schedule puro + sync idempotente), imports CSV (papaparse, JSON, preview/commit/undo, fixture), 121 testes api, ADR-017/018. Sugestões de contrato: campos de exibição, extensões de import.
🧭 Validação própria: typecheck/lint/format/test verdes (api 121, shared 263). ✅ APROVADOS B e C (1 rodada cada).
🧭 → 🔧 (Executor D) 2c: integrar budgets/summary, contrato (display fields, % 0–100, net, import no shared), testes determinísticos, seed demo 6 meses (mulberry32), teste do seed.
🔧 → 🧭 (D) PARCIAL: integração, contrato (display fields, % 0–100, net, import no shared), testes determinísticos, seed demo (199 tx, 5 regras, 42 orçamentos), demo.test.ts, ADR-019. db:reset bloqueado pelo guarda do Prisma contra agentes (exige consentimento do usuário) — não contornado.
🧭 Validação própria: typecheck/lint/format/test verdes (shared 267, api 125); db:seed 2× sem duplicar; dev + navegador: login demo 200, /summary/month 200, /transactions com category/account, /docs 27 paths.
🧭 ✅ APROVADO fase 2 → commit. Pendente para o usuário: rodar db:reset ele mesmo se quiser. Nota p/ fase 4/5: taxa de poupança do mês parcial (-325%) precisa de tratamento visual.
Commit ee9b997.

## Fase 3
🧭 → 🔧 (Executor E) Direção de design: impeccable (init/shape → PRODUCT.md, DESIGN.md), design-taste-frontend (fluxo app/dashboard), 3 nomes + escolha, packages/tokens (CSS vars + tema RN + testes de contraste e paleta), docs/design/tokens.html.
🔧 → 🧭 (E) FEITO: PRODUCT.md, DESIGN.md (direção "Concreto e azulejo", régua do mês), Archivo, paleta de dados 5 cores validada p/ daltonismo, nome Sobra (vs Folga, Fôlego), @financas/tokens (222 testes: WCAG, ΔE OKLab, snapshots), docs/design/tokens.html, ADR-020..022.
🧭 Validação própria: verde (tokens 222, shared 267, api 125); tokens.html aberto no navegador a 1440px, claro e escuro lado a lado, sem overflow; KPI + régua, transações, orçamento folgado/perto/estourado (hachurado).
🧭 Decisões aceitas: paleta de 5 cores + "Outras"; cor da categoria só como marcador de identidade, gráfico por categoria em barras de um matiz.
🧭 ✅ APROVADO fase 3 (1 rodada) → commit
Commit 65a73b3.

## Pré-fases 4/5
🧭 → 🔧 (Executor F) @financas/client: createApiClient com TokenStore, refresh single-flight, validação Zod, ApiError pt-BR; queryKeys/queryOptions/mutations com invalidação e otimista; testes.
🔧 → 🧭 (F) FEITO: @financas/client (+/query), 42 testes, integração real na API, ADR-023. Discordou: não desloga em falha de rede/5xx no refresh (aceito).
🧭 Validação própria: client ok, mas `pnpm test` raiz falhou: 32 testes da api skipped por hookTimeout (beforeAll com argon2) sob carga paralela; api sozinha 129/129.
🧭 🔁 REVISAR (F): argon2 barato em teste via env, hookTimeout 30s, 3 rodadas verdes na raiz.
🔧 → 🧭 (F) FEITO revisão: perfis argon2 (production padrão, test barato só via createTestApp, recusado em produção), hookTimeout 30s, 3 rodadas verdes; api 28s → 11s; ADR-024.
🧭 Validação própria: raiz verde, 0 skipped. ✅ APROVADO (2 rodadas) → commit
