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
Commit 37f014f.

## Fases 4 e 5 (paralelo)
🧭 → 🔧 (Executor W) 4a web: base (router, auth, tema sem flash, tokens CSS), painel (KPIs + régua + 4 gráficos, mês parcial), testes, screenshots.
🧭 → 🔧 (Executor M) 5a mobile: base (router tabs, secure-store, Archivo), auth, lançar gasto em 3 toques (teclado próprio, otimista, haptics), resumo do mês com orçamentos, testes, screenshots via Expo web.
🔧 → 🧭 (W) FEITO 4a: React Router 7.18, visx, CSS Modules sobre tokens, tema sem flash, auth demo, painel (resumo + régua + KPIs + 4 gráficos acessíveis, mês parcial "Em aberto"), 28 testes, build 180 KB gzip, 7 screenshots, ADR-025/026.
🧭 Validação própria: capturas claro desktop e escuro mobile conferidas — fiel ao DESIGN. Achados: cores padrão de categoria colidem (Moradia/Assinaturas roxas); vão abaixo de "Gastos por categoria" no desktop.
🧭 ✅ APROVADO 4a → 🧭 → 🔧 (W) 4b: /transacoes (TanStack Table), contas, categorias, orçamentos, importar CSV + correções a/b.
🔧 → 🧭 (W) FEITO 4b: /transacoes (TanStack Table, filtros na URL, painel <dialog>, otimista, desfazer), contas, categorias, orçamentos (BudgetMeter inline, copiar), importar (prévia editável, duplicatas, desfazer); 13 cores de identidade (ΔE ≥ 8); grid do painel; 60 testes web; ADR-027.
🧭 Validação própria: capturas de edição e prévia de importação conferidas. ✅ APROVADO fase 4 (4a e 4b, 1 rodada cada). Commit aguardando M (lockfile compartilhado).
🔧 → 🧭 (M) FEITO 5a: Expo Router (auth/app, TabBar com Lançar), secure-store, Archivo, auth demo, lançar em 3 toques (teclado em centavos, folha própria com mola dos tokens, otimista + háptico), resumo com régua e orçamentos, mês parcial; 30 testes; screenshots; ADR-028..030.
🧭 Validação própria: capturas resumo-outubro e lançar-categoria conferidas. Achados: screenshots com cores antigas de categoria; número principal verde no mobile vs tinta no web.
🧭 ✅ APROVADO 5a → 🧭 → 🔧 (M) 5b: lista por dia com infinite scroll, filtros, deslizar editar/apagar (+ ações acessíveis), edição, correções a/b, screenshots refeitas.
🔧 → 🧭 (M) FEITO 5b: lista por dia (infinite, busca, filtros com chips), SwipeableRow (Editar/Apagar, limiar 60% com háptico, rubber-band, uma aberta por vez), ações acessíveis + toque longo, edição na folha, número principal alinhado ao web, screenshots refeitas, 44 testes, ADR-031.
🧭 Validação própria: frozen install, typecheck, lint, format, test (tokens 222, shared 267, client 42, api 132, web 60, mobile 44), web build. Captura do deslize conferida.
🧭 ✅ APROVADO fase 5 (5a e 5b, 1 rodada cada) → commits fase 4 e fase 5
Commits de2cb96 (web) e 2f90396 (mobile).

## Fase 6 (paralelo)
🧭 → 🔧 (P1) web: identityColors → tokens; break-ui (pior caso só em dev), improve-animations + animate, impeccable audit/polish, a11y com axe no teste, bundle, capturas, docs/polimento-web.md.
🧭 → 🔧 (P2) mobile: lista infinita no client; break-ui (+ fontScale 2.0), improve-animations + animate-expo, impeccable audit/polish, a11y com testes, capturas, docs/polimento-mobile.md.
🔧 → 🧭 (P1) FEITO: identityColors em tokens (web + api); break-ui com cenários na fronteira do fetch (seletor só em DEV, fora do dist); correções de overflow (fit por cqi, table-layout fixed, 2 linhas + title, textarea); animações (reduced motion 120ms, backdrop); impeccable audit/polish; axe no teste (10) + Playwright 0 violações; foco restaurado; bundle 182 → 69+98 KB gzip; ADR-032; docs/polimento-web.md.
🧭 Validação própria: captura pior-caso-painel-depois-1440 conferida (R$ 999.999.999,99, nomes de 120 chars, CJK, 1000% estourado). ✅ APROVADO P1. Aguardando P2.
🔧 → 🧭 (P2) FEITO: lista infinita no client (+8 testes) e mobile sem espelhamento; break-ui com cenários em __DEV__ + fontScale 1/1.5/2; correções de corte, abas, folha rolável; animações (sem animação por dígito, reduce motion, troca de mês por gesto); impeccable; a11y (anúncios, teclado tecla a tecla, 72 pares de contraste); ADR-033; docs/polimento-mobile.md.
🧭 Validação própria: captura fonte-ampliada conferida; raiz verde (tokens 225, shared 267, client 50, api 132, web 82, mobile 139), web e api build. ✅ APROVADO fase 6 (1 rodada cada) → commit
Commit 864e87c.

## Fase 7
🧭 → 🔧 (Executor R) README de portfólio: 3 comandos testados em clone limpo, capturas, 2 diagramas Mermaid, decisões com links de ADR, números reais de testes, limitações honestas, próximos aprendizados, LICENSE MIT.
🔧 → 🧭 (R) FEITO: scripts bootstrap/dev/dev:mobile + scripts/ensure-env.mjs; README (capturas, 3 comandos, 2 Mermaid validados, 11 decisões, 895 testes, limitações, próximos passos); LICENSE MIT; clone limpo testado.
🧭 ✅ APROVADO fase 7 → commit; validação própria em clone do commit a seguir.

## Pós-portfólio (pedido do dono: cookies + i18n, tirar seções finais do README)
Commits após a fase 7: 7f924cc (fix iOS), 8995618 (rename sobra), a8e5895 (.env.example mobile); push para github.com/Felixdario/sobra.
🧭 → 🔧 (Executor K) sessão web com cookie httpOnly + CSRF double-submit; client com modo cookie; mobile intacto; ADR novo.
🔧 → 🧭 (K) FEITO: cookie sobra_refresh HttpOnly/SameSite=Strict/Path=/auth + CSRF double-submit (sobra_csrf + X-CSRF-Token), client session:'cookie', web sem refresh no localStorage, mobile intacto, ADR-034.
🧭 Validação própria: raiz verde (tokens 225, shared 268, client 60, api 149, web 84, mobile 141); navegador: login → localStorage vazio, JS só vê sobra_csrf; recarregar → /api/auth/refresh + /api/me → Painel. ✅ APROVADO → commit
Commit 104dc0c.
🧭 → 🔧 (Executor I) base i18n: formatMoney/parseMoney/datas por locale, @sobra/i18n com catálogos tipados pt-BR/en-US e plural, preferências locale+currency na API, estratégia de erros e categorias padrão, ADR.
🔧 → 🧭 (I) FEITO base: formatMoney/parseMoney/datas por locale, @sobra/i18n próprio (catálogo tipado, PluralRules com fallback), preferências na API (migration), systemKey nas categorias padrão, erros por code, ADR-035; 1022 testes.
🧭 Validação própria: raiz verde. 🔁 REVISAR (I): tradução de issues Zod na base (translateIssue + helper de formulário + teste de cobertura).
🔧 → 🧭 (I) FEITO revisão: VALIDATION_MESSAGES no shared + translateIssue/translateFieldError, 6 buracos fechados, varredura de cobertura; 1050 testes.
🧭 Validação própria: raiz verde, builds ok. ✅ APROVADO base i18n (2 rodadas). Planejador dividiu o catálogo em base + web.* + mobile.* (arquivos separados) para o trabalho em paralelo. → commit
Commit 8c39aeb.
🧭 → 🔧 (W2) traduzir web (web.*), moeda de exibição, preferências na UI, teste de literais, capturas en-*.
🧭 → 🔧 (M2) traduzir mobile (mobile.*), teclado/valores por locale, a11y traduzida, Ajustes, teste de literais, capturas en-*.
🔧 → 🧭 (M2) FEITO: useI18n (me → preferência local → aparelho), todas as telas e a11y traduzidas, Ajustes com idioma/moeda otimista, grade de categorias adaptativa, teste de literais por AST, expo-localization, 162 testes, capturas en-*.
🧭 Validação própria: captura en-resumo conferida (Left over $769.90, categorias traduzidas, sem R$). ✅ APROVADO M2. Lacunas para a base listadas (Hoje/Ontem no catálogo, leitura por extenso, ações comuns). Aguardando W2.
🔧 → 🧭 (W2) FEITO: I18nProvider via QueryCache, ~330 chaves web.*, todas as telas/aria/gráficos, diálogo Idioma e moeda otimista, errorText por code, rowError da prévia, teste de literais, 100 testes web, capturas en-*. Achado: catálogo carrega strings do outro app (+20 KB gzip).
🧭 Validação própria: captura en-dashboard conferida; raiz verde (1087 testes), builds ok. ✅ APROVADO W2 → commit
