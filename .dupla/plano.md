# Plano — Projeto 1: controle financeiro pessoal

Modo: paralelo · até 3 rodadas de REVISAR por passo · 1 commit por fase

## Ambiente (verificado 2026-11-04)
- Node v22.14.0 ✓ · Git 2.49 ✓ · npm 11.21 ✓
- pnpm: não instalado globalmente → usado via `corepack pnpm` (campo `packageManager`), sem instalação global
- Docker: não instalado → PostgreSQL de produção fica no docker-compose.yml, dev/testes usam SQLite (registrar em docs/decisoes.md)

## Fases
| # | Fase | Critério de aceite | Como verificar |
|---|------|--------------------|----------------|
| 0 | Esqueleto | monorepo com 4 workspaces; install e typecheck passam | `corepack pnpm install && corepack pnpm typecheck` exit 0 |
| 1 | Contratos (shared) | schemas Zod + dinheiro/datas com testes | `pnpm --filter @financas/shared test` |
| 2 | API | rotas, auth, seed, testes de integração, /docs | `pnpm --filter @financas/api test` + GET /docs 200 |
| 3 | Direção de design | PRODUCT.md, DESIGN.md, tokens, nome | arquivos + tokens em packages/shared ou packages/tokens |
| 4 | Web (paralelo c/ 5) | telas consumindo API real | testes + navegador |
| 5 | Mobile (paralelo c/ 4) | telas consumindo API real | jest-expo + Expo web/simulador |
| 6 | Polimento | break-ui, animações, a11y | relatórios + correções |
| 7 | Portfólio | README completo | leitura |

## Fase 0 — passo único
Objetivo: monorepo pnpm com packages/shared, apps/api, apps/web, apps/mobile mínimos, tooling (TS estrito, ESLint flat, Prettier, Vitest), CI do GitHub Actions, docs/decisoes.md.
Critério: install + typecheck + lint passam; git inicializado; commit `chore: ...`.
