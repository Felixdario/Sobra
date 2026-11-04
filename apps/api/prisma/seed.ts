import { formatBRL, toLocalDateKey } from '@financas/shared';
import { loadDotEnv, loadEnv, sqlitePath } from '../src/config/env';
import { createPrismaClient } from '../src/lib/db';
import { createPasswordHasher } from '../src/modules/auth/password';
import { DEMO_USER, seedDemo } from '../src/seed/demo';

loadDotEnv();
const env = loadEnv();
const today = process.env.SEED_TODAY || toLocalDateKey(new Date());
const prisma = createPrismaClient(sqlitePath(env.DATABASE_URL));

try {
  const summary = await seedDemo(prisma, {
    today,
    passwords: createPasswordHasher(env.ARGON2_PROFILE),
  });
  console.log(`Usuário demo: ${DEMO_USER.email} / ${DEMO_USER.password} (referência ${today})`);
  console.table(
    summary.months.map((month) => ({
      mês: month.month,
      transações: month.transactions,
      receitas: formatBRL(month.income),
      despesas: formatBRL(month.expense),
      'taxa de poupança': month.savingsRate === null ? '—' : `${month.savingsRate.toFixed(1)}%`,
    })),
  );
  for (const account of summary.balances)
    console.log(`  ${account.name}: ${formatBRL(account.balance)}`);
  console.log(`Saldo total: ${formatBRL(summary.totalBalance)}`);
  console.log(
    `Mês atual (${summary.current.month}): receitas ${formatBRL(summary.current.income)} · despesas ${formatBRL(summary.current.expense)}`,
  );
} finally {
  await prisma.$disconnect();
}
