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
