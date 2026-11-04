# Conversa da dupla

## Fase 0
🧭 → 🔧 (Executor A) Passo 1/1: esqueleto do monorepo (git, pnpm via corepack, 4 workspaces, ESLint/Prettier/Vitest/jest-expo, CI, docs/decisoes.md). Sem commit.
🔧 → 🧭 FEITO: 4 workspaces, 6 testes, CI, ADR-001..006. Discordou: ESLint 10 (estável), TS 6.0.3 / React 19.3.0 / jsdom 29 por compatibilidade, rota em app.ts. Risco: linker hoisted forçado pelo limite de ~260 caracteres de caminho no Windows.
🧭 Validação própria: install/typecheck/lint/test/format:check exit 0 (3+1+1+1 testes). Discordâncias aceitas.
🧭 ✅ APROVADO → commit 5bf5a90
