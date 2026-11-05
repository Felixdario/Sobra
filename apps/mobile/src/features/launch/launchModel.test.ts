import { accountSchema, categorySchema, transactionSchema } from '@financas/shared';
import { accounts, categories, expense, ids, recent, transfer } from '../../test/fixtures';
import {
  buildPayload,
  buildUpdate,
  draftFromTransaction,
  pickDefaultAccount,
  rankCategories,
} from './launchModel';

const parsedAccounts = accounts.map((item) => accountSchema.parse(item));
const parsedCategories = categories.map((item) => categorySchema.parse(item));
const parsedRecent = recent.map((item) => transactionSchema.parse(item));

describe('modelo do lançamento', () => {
  it('ordena as categorias do tipo pelas mais usadas', () => {
    const ranked = rankCategories(parsedCategories, parsedRecent, 'expense').map(
      (item) => item.name,
    );
    expect(ranked).toEqual(['Transporte', 'Mercado', 'Lazer']);
  });

  it('conta padrão: a última usada no app, senão a da transação mais recente', () => {
    expect(pickDefaultAccount(parsedAccounts, parsedRecent, ids.wallet)?.name).toBe('Carteira');
    expect(pickDefaultAccount(parsedAccounts, parsedRecent, null)?.name).toBe('Nubank');
    expect(pickDefaultAccount(parsedAccounts, [], 'sumiu')?.name).toBe('Nubank');
  });

  it('descrição vazia vira o nome da categoria; falta de categoria bloqueia', () => {
    const draft = {
      type: 'expense' as const,
      amount: 1_250,
      categoryId: ids.mercado,
      accountId: ids.checking,
      date: '2026-11-04',
      description: '  ',
      notes: '',
      editing: null,
    };
    expect(buildPayload(draft, parsedCategories)).toEqual({
      type: 'expense',
      accountId: ids.checking,
      categoryId: ids.mercado,
      amount: 1_250,
      description: 'Mercado',
      date: '2026-11-04',
    });
    expect(buildPayload({ ...draft, categoryId: null }, parsedCategories)).toBeNull();
    expect(buildPayload({ ...draft, amount: 0 }, parsedCategories)).toBeNull();
  });
});

describe('modo edição', () => {
  const tx = transactionSchema.parse(
    expense(ids.tx1, ids.mercado, ids.checking, 4_590, '2026-10-20'),
  );

  it('parte da transação e manda o PATCH completo, com observação vazia virando null', () => {
    const draft = draftFromTransaction(tx);
    expect(draft).toMatchObject({ amount: 4_590, categoryId: ids.mercado, date: '2026-10-20' });
    expect(
      buildUpdate(
        { ...draft, amount: 5_000, categoryId: ids.lazer, description: '' },
        parsedCategories,
      ),
    ).toEqual({
      type: 'expense',
      accountId: ids.checking,
      categoryId: ids.lazer,
      amount: 5_000,
      date: '2026-10-20',
      description: 'Lazer',
      notes: null,
    });
  });

  it('transferência edita só valor, data, descrição e observações', () => {
    const move = transactionSchema.parse(
      transfer(ids.tx2, ids.checking, ids.wallet, 50_000, '2026-10-15'),
    );
    const draft = { ...draftFromTransaction(move), amount: 40_000, notes: 'Saque' };
    expect(buildUpdate(draft, parsedCategories)).toEqual({
      amount: 40_000,
      date: '2026-10-15',
      description: 'Transferência',
      notes: 'Saque',
    });
  });
});
