import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  accountSchema,
  categorySchema,
  paginated,
  recurringSchema,
  transactionSchema,
} from '@sobra/shared';
import type { App } from '../../app';
import {
  authHeader,
  createTestApp,
  errorOf,
  registerUser,
  type TestUser,
} from '../../test/helpers';
import { addDays } from './schedule';
import { syncDueRecurring } from './service';

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

describe('/recurring', () => {
  let app: App;
  const today = '2026-06-15';

  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-06-15T15:00:00.000Z') });
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
    vi.useRealTimers();
  });

  async function setup() {
    const user: TestUser = await registerUser(app);
    const api = (method: Method, url: string, payload?: object) =>
      app.inject({ method, url, headers: authHeader(user), ...(payload && { payload }) });
    const categories = categorySchema.array().parse((await api('GET', '/categories')).json());
    const category = (name: string) => categories.find((c) => c.name === name)?.id ?? '';
    const accounts = accountSchema.array().parse((await api('GET', '/accounts')).json());
    const wallet = accounts[0]?.id ?? '';
    const create = async (rule: object, template: object = {}) => {
      const response = await api('POST', '/recurring', {
        rule,
        template: {
          type: 'expense',
          accountId: wallet,
          categoryId: category('Moradia'),
          amount: 150_000,
          description: 'Aluguel',
          ...template,
        },
      });
      expect(response.statusCode, response.body).toBe(201);
      return recurringSchema.parse(response.json());
    };
    const generated = async (ruleId: string) =>
      app.prisma.transaction.findMany({
        where: { recurringRuleId: ruleId },
        orderBy: { date: 'asc' },
      });
    return { user, api, category, wallet, create, generated };
  }

  it('cria, detalha, lista, atualiza e exclui', async () => {
    const { api, create } = await setup();
    const created = await create({ frequency: 'monthly', startDate: '2099-01-31' });
    expect(created).toMatchObject({
      rule: { frequency: 'monthly', interval: 1, startDate: '2099-01-31' },
      template: { type: 'expense', amount: 150_000, description: 'Aluguel' },
      active: true,
      nextOccurrence: '2099-01-31',
    });

    expect((await api('GET', `/recurring/${created.id}`)).json()).toEqual(created);
    const list = recurringSchema.array().parse((await api('GET', '/recurring')).json());
    expect(list.map((r) => r.id)).toEqual([created.id]);

    const updated = await api('PATCH', `/recurring/${created.id}`, {
      rule: { frequency: 'monthly', startDate: '2099-02-01', dayOfMonth: 10 },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({ nextOccurrence: '2099-02-10' });

    const paused = await api('PATCH', `/recurring/${created.id}`, { active: false });
    expect(paused.json()).toMatchObject({ active: false });

    expect((await api('DELETE', `/recurring/${created.id}`)).statusCode).toBe(204);
    expect((await api('GET', `/recurring/${created.id}`)).statusCode).toBe(404);
  });

  it('valida regra e modelo', async () => {
    const { api, wallet, category } = await setup();
    const invalid = await api('POST', '/recurring', {
      rule: { frequency: 'weekly', startDate: '2026-11-04', dayOfMonth: 3 },
      template: { type: 'expense', accountId: wallet, amount: 0, description: '' },
    });
    expect(invalid.statusCode).toBe(400);

    const wrongKind = await api('POST', '/recurring', {
      rule: { frequency: 'monthly', startDate: '2026-11-04' },
      template: {
        type: 'income',
        accountId: wallet,
        categoryId: category('Moradia'),
        amount: 100,
        description: 'x',
      },
    });
    expect(wrongKind.statusCode).toBe(400);
    expect(errorOf(wrongKind).message).toBe('Uma receita só pode usar categoria de receita');
  });

  it('sync materializa as ocorrências devidas até hoje e é idempotente', async () => {
    const { api, create, generated } = await setup();
    const start = addDays(today, -21);
    const rule = await create({ frequency: 'weekly', startDate: start });
    const expected = [start, addDays(start, 7), addDays(start, 14), today];

    const first = await api('POST', '/recurring/sync');
    expect(first.json()).toEqual({ created: 4 });
    const second = await api('POST', '/recurring/sync');
    expect(second.json()).toEqual({ created: 0 });

    const rows = await generated(rule.id);
    expect(rows.map((row) => row.date)).toEqual(expected);
    expect(rows.every((row) => row.amount === 150_000n && row.type === 'expense')).toBe(true);

    const after = recurringSchema.parse((await api('GET', `/recurring/${rule.id}`)).json());
    expect(after.nextOccurrence).toBe(addDays(today, 7));
  });

  it('GET /transactions sincroniza antes de listar', async () => {
    const { api, create } = await setup();
    await create({ frequency: 'monthly', startDate: today }, { description: 'Academia' });

    const page = paginated(transactionSchema).parse((await api('GET', '/transactions')).json());
    expect(page.items.map((t) => [t.date, t.description])).toEqual([[today, 'Academia']]);
    const again = paginated(transactionSchema).parse((await api('GET', '/transactions')).json());
    expect(again.total).toBe(1);
  });

  it('syncDueRecurring não duplica mesmo se nextOccurrence voltar no tempo', async () => {
    const { user, create, generated } = await setup();
    const rule = await create({ frequency: 'monthly', startDate: '2026-01-31' });

    expect(await syncDueRecurring(app.prisma, user.user.id, '2026-04-15')).toBe(3);
    await app.prisma.recurringRule.update({
      where: { id: rule.id },
      data: { nextOccurrence: '2026-01-31' },
    });
    expect(await syncDueRecurring(app.prisma, user.user.id, '2026-04-15')).toBe(0);
    expect((await generated(rule.id)).map((row) => row.date)).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
    ]);
  });

  it('respeita a data final e recorrências pausadas', async () => {
    const { user, api, create, generated } = await setup();
    const ended = await create({
      frequency: 'monthly',
      startDate: '2026-01-10',
      endDate: '2026-02-10',
    });
    const paused = await create({ frequency: 'weekly', startDate: '2026-01-01' });
    await api('PATCH', `/recurring/${paused.id}`, { active: false });

    await syncDueRecurring(app.prisma, user.user.id, '2026-06-01');
    expect((await generated(ended.id)).map((row) => row.date)).toEqual([
      '2026-01-10',
      '2026-02-10',
    ]);
    expect(await generated(paused.id)).toEqual([]);
    const endedAfter = recurringSchema.parse((await api('GET', `/recurring/${ended.id}`)).json());
    expect(endedAfter.nextOccurrence).toBeNull();
  });

  it('ao reativar não gera o período pausado', async () => {
    const { api, create, generated } = await setup();
    const rule = await create({ frequency: 'weekly', startDate: addDays(today, -28) });
    await api('PATCH', `/recurring/${rule.id}`, { active: false });

    const resumed = recurringSchema.parse(
      (await api('PATCH', `/recurring/${rule.id}`, { active: true })).json(),
    );
    expect(resumed.nextOccurrence).toBe(today);
    await api('POST', '/recurring/sync');
    expect((await generated(rule.id)).map((row) => row.date)).toEqual([today]);
  });

  it('transferência recorrente movimenta as duas contas', async () => {
    const { api, wallet, create } = await setup();
    const savings = accountSchema.parse(
      (
        await api('POST', '/accounts', {
          name: 'Poupança',
          type: 'savings',
          color: '#00AA00',
          icon: 'piggy-bank',
        })
      ).json(),
    );
    await create(
      { frequency: 'monthly', startDate: today },
      { type: 'transfer', toAccountId: savings.id, amount: 5_000, description: 'Guardar' },
    );
    await api('POST', '/recurring/sync');

    const accounts = accountSchema.array().parse((await api('GET', '/accounts')).json());
    const balance = new Map(accounts.map((a) => [a.id, a.balance]));
    expect(balance.get(wallet)).toBe(-5_000);
    expect(balance.get(savings.id)).toBe(5_000);
  });

  describe('isolamento', () => {
    it('B não lê, edita, apaga nem sincroniza recorrência de A', async () => {
      const alice = await setup();
      const bob = await setup();
      const rule = await alice.create({ frequency: 'weekly', startDate: addDays(today, -7) });

      for (const [method, payload] of [
        ['GET', undefined],
        ['PATCH', { active: false }],
        ['DELETE', undefined],
      ] as const) {
        const response = await bob.api(method, `/recurring/${rule.id}`, payload);
        expect(response.statusCode).toBe(404);
        expect(errorOf(response).message).toBe('Recorrência não encontrada');
      }
      expect((await bob.api('GET', '/recurring')).json()).toEqual([]);
      expect((await bob.api('POST', '/recurring/sync')).json()).toEqual({ created: 0 });
      expect(await alice.generated(rule.id)).toEqual([]);
    });

    it('B não cria recorrência com conta ou categoria de A (404)', async () => {
      const alice = await setup();
      const bob = await setup();
      const rule = { frequency: 'monthly', startDate: '2099-01-01' };

      const foreignAccount = await bob.api('POST', '/recurring', {
        rule,
        template: {
          type: 'expense',
          accountId: alice.wallet,
          categoryId: bob.category('Moradia'),
          amount: 1,
          description: 'x',
        },
      });
      expect(foreignAccount.statusCode).toBe(404);

      const foreignCategory = await bob.api('POST', '/recurring', {
        rule,
        template: {
          type: 'expense',
          accountId: bob.wallet,
          categoryId: alice.category('Moradia'),
          amount: 1,
          description: 'x',
        },
      });
      expect(foreignCategory.statusCode).toBe(404);
    });
  });
});
