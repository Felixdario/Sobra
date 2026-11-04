import type {
  RecurrenceRule,
  Recurring,
  RecurringCreate,
  RecurringUpdate,
  TransactionTemplate,
} from '@financas/shared';
import { type Db, isUniqueViolation } from '../../lib/db';
import { notFound } from '../../lib/errors';
import { fromDbCents, toDbCents } from '../../lib/money';
import type { RecurringRule as RecurringRow } from '../../generated/prisma/client';
import { assertTransactionRefs } from '../transactions/refs';
import { addDays, firstOccurrenceFrom, nextOccurrences, type ScheduleRule } from './schedule';

const RECURRING_NOT_FOUND = 'Recorrência não encontrada';

function toRule(row: RecurringRow): RecurrenceRule {
  return {
    frequency: row.frequency,
    interval: row.interval,
    startDate: row.startDate,
    ...(row.endDate !== null && { endDate: row.endDate }),
    ...(row.dayOfMonth !== null && { dayOfMonth: row.dayOfMonth }),
  };
}

function toTemplate(row: RecurringRow): TransactionTemplate {
  const base = {
    accountId: row.accountId,
    amount: fromDbCents(row.amount),
    description: row.description,
    ...(row.notes !== null && { notes: row.notes }),
  };
  return row.type === 'transfer'
    ? { ...base, type: 'transfer', toAccountId: row.toAccountId ?? '' }
    : { ...base, type: row.type, categoryId: row.categoryId ?? '' };
}

const toRecurring = (row: RecurringRow): Recurring => ({
  id: row.id,
  rule: toRule(row),
  template: toTemplate(row),
  active: row.active,
  nextOccurrence: row.nextOccurrence,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const ruleData = (rule: RecurrenceRule) => ({
  frequency: rule.frequency,
  interval: rule.interval,
  startDate: rule.startDate,
  endDate: rule.endDate ?? null,
  dayOfMonth: rule.dayOfMonth ?? null,
});

const templateData = (template: TransactionTemplate) => ({
  type: template.type,
  accountId: template.accountId,
  toAccountId: template.type === 'transfer' ? template.toAccountId : null,
  categoryId: template.type === 'transfer' ? null : template.categoryId,
  amount: toDbCents(template.amount),
  description: template.description,
  notes: template.notes ?? null,
});

async function findOwnedRecurring(db: Db, userId: string, id: string): Promise<RecurringRow> {
  const row = await db.recurringRule.findFirst({ where: { id, userId } });
  if (!row) throw notFound(RECURRING_NOT_FOUND);
  return row;
}

export async function listRecurring(db: Db, userId: string): Promise<Recurring[]> {
  const rows = await db.recurringRule.findMany({
    where: { userId },
    orderBy: [{ active: 'desc' }, { nextOccurrence: 'asc' }, { createdAt: 'asc' }],
  });
  return rows.map(toRecurring);
}

export async function getRecurring(db: Db, userId: string, id: string): Promise<Recurring> {
  return toRecurring(await findOwnedRecurring(db, userId, id));
}

export async function createRecurring(
  db: Db,
  userId: string,
  { rule, template }: RecurringCreate,
): Promise<Recurring> {
  await assertTransactionRefs(db, userId, template);
  const row = await db.recurringRule.create({
    data: {
      ...ruleData(rule),
      ...templateData(template),
      nextOccurrence: firstOccurrenceFrom(rule, rule.startDate),
      userId,
    },
  });
  return toRecurring(row);
}

/**
 * The rule restarts after the last occurrence already generated. When it is (re)activated it
 * also never goes back before `today`, so pausing for months does not backfill the gap.
 */
async function recomputeNext(
  db: Db,
  row: RecurringRow,
  rule: ScheduleRule,
  today: string,
  reactivated: boolean,
): Promise<string | null> {
  const last = await db.transaction.findFirst({
    where: { recurringRuleId: row.id },
    orderBy: { date: 'desc' },
    select: { date: true },
  });
  let from = last ? addDays(last.date, 1) : rule.startDate;
  if (reactivated && today > from) from = today;
  return firstOccurrenceFrom(rule, from);
}

export async function updateRecurring(
  db: Db,
  userId: string,
  id: string,
  update: RecurringUpdate,
  today: string,
): Promise<Recurring> {
  const current = await findOwnedRecurring(db, userId, id);
  if (update.template) {
    const previous = [current.accountId, current.toAccountId].filter((value) => value !== null);
    await assertTransactionRefs(db, userId, update.template, previous);
  }

  const rule = update.rule ?? toRule(current);
  const reactivated = update.active === true && !current.active;
  const nextOccurrence =
    update.rule || reactivated
      ? await recomputeNext(db, current, rule, today, reactivated)
      : current.nextOccurrence;

  const row = await db.recurringRule.update({
    where: { id },
    data: {
      ...(update.rule && ruleData(update.rule)),
      ...(update.template && templateData(update.template)),
      ...(update.active !== undefined && { active: update.active }),
      nextOccurrence,
    },
  });
  return toRecurring(row);
}

/** Deletes the rule; transactions it already generated stay (their link is set to null). */
export async function deleteRecurring(db: Db, userId: string, id: string): Promise<void> {
  await findOwnedRecurring(db, userId, id);
  await db.recurringRule.delete({ where: { id } });
}

/**
 * Materializes every occurrence due up to `today` (inclusive) for the user's active rules and
 * advances `nextOccurrence`. Idempotent: `@@unique([recurringRuleId, date])` rejects a second
 * insert of the same occurrence, even from a concurrent request. Rules whose account is archived
 * wait until it is restored. Returns how many transactions were created.
 */
export async function syncDueRecurring(db: Db, userId: string, today: string): Promise<number> {
  const due = await db.recurringRule.findMany({
    where: {
      userId,
      active: true,
      nextOccurrence: { lte: today },
      account: { archived: false },
      OR: [{ toAccountId: null }, { toAccount: { is: { archived: false } } }],
    },
  });

  let created = 0;
  for (const rule of due) {
    const from = rule.nextOccurrence ?? rule.startDate;
    const dates = nextOccurrences(rule, from, today);
    const existing = await db.transaction.findMany({
      where: { recurringRuleId: rule.id, date: { in: dates } },
      select: { date: true },
    });
    const taken = new Set(existing.map((row) => row.date));

    for (const date of dates) {
      if (taken.has(date)) continue;
      try {
        await db.transaction.create({
          data: {
            userId,
            type: rule.type,
            accountId: rule.accountId,
            toAccountId: rule.toAccountId,
            categoryId: rule.categoryId,
            amount: rule.amount,
            description: rule.description,
            notes: rule.notes,
            date,
            recurringRuleId: rule.id,
          },
        });
        created++;
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
      }
    }

    await db.recurringRule.updateMany({
      where: { id: rule.id, nextOccurrence: rule.nextOccurrence },
      data: { nextOccurrence: firstOccurrenceFrom(rule, addDays(today, 1)) },
    });
  }
  return created;
}
