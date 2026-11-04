import { describe, expect, it } from 'vitest';
import { addDays, firstOccurrenceFrom, nextOccurrences, type ScheduleRule } from './schedule';

const monthly = (startDate: string, extra: Partial<ScheduleRule> = {}): ScheduleRule => ({
  frequency: 'monthly',
  interval: 1,
  startDate,
  ...extra,
});

describe('nextOccurrences', () => {
  it('mensal no dia 31 cai no último dia dos meses curtos, sem deslocar os seguintes', () => {
    expect(nextOccurrences(monthly('2026-01-31'), '2026-01-01', '2026-05-31')).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
      '2026-05-31',
    ]);
  });

  it('mensal em ano bissexto usa 29/02', () => {
    expect(
      nextOccurrences(monthly('2028-01-01', { dayOfMonth: 30 }), '2028-02-01', '2028-03-31'),
    ).toEqual(['2028-02-29', '2028-03-30']);
  });

  it('mensal com dayOfMonth anterior ao dia inicial começa no mês seguinte', () => {
    expect(
      nextOccurrences(monthly('2026-01-15', { dayOfMonth: 10 }), '2026-01-01', '2026-03-31'),
    ).toEqual(['2026-02-10', '2026-03-10']);
  });

  it('mensal com intervalo atravessa o ano', () => {
    expect(
      nextOccurrences(monthly('2026-11-30', { interval: 3 }), '2026-01-01', '2027-08-31'),
    ).toEqual(['2026-11-30', '2027-02-28', '2027-05-30', '2027-08-30']);
  });

  it('semanal respeita o intervalo', () => {
    const rule: ScheduleRule = { frequency: 'weekly', interval: 2, startDate: '2026-11-02' };
    expect(nextOccurrences(rule, '2026-11-01', '2026-12-14')).toEqual([
      '2026-11-02',
      '2026-11-16',
      '2026-11-30',
      '2026-12-14',
    ]);
  });

  it('semanal atravessa a virada do ano', () => {
    const rule: ScheduleRule = { frequency: 'weekly', interval: 1, startDate: '2026-12-25' };
    expect(nextOccurrences(rule, '2026-12-26', '2027-01-08')).toEqual(['2027-01-01', '2027-01-08']);
  });

  it('anual em 29/02 cai em 28/02 nos anos não bissextos', () => {
    const rule: ScheduleRule = { frequency: 'yearly', interval: 1, startDate: '2028-02-29' };
    expect(nextOccurrences(rule, '2028-01-01', '2032-12-31')).toEqual([
      '2028-02-29',
      '2029-02-28',
      '2030-02-28',
      '2031-02-28',
      '2032-02-29',
    ]);
  });

  it('respeita data final, data inicial e o intervalo pedido', () => {
    const rule = monthly('2026-01-05', { endDate: '2026-04-04' });
    expect(nextOccurrences(rule, '2026-02-06', '2026-12-31')).toEqual(['2026-03-05']);
    expect(nextOccurrences(rule, '2025-01-01', '2026-01-04')).toEqual([]);
    expect(nextOccurrences(rule, '2026-05-01', '2026-12-31')).toEqual([]);
  });

  it('inclui os dois extremos', () => {
    expect(nextOccurrences(monthly('2026-01-10'), '2026-02-10', '2026-03-10')).toEqual([
      '2026-02-10',
      '2026-03-10',
    ]);
  });
});

describe('firstOccurrenceFrom', () => {
  it('devolve a próxima ocorrência ou null depois do fim', () => {
    const rule = monthly('2026-01-31', { endDate: '2026-03-15' });
    expect(firstOccurrenceFrom(rule, '2026-01-01')).toBe('2026-01-31');
    expect(firstOccurrenceFrom(rule, '2026-02-01')).toBe('2026-02-28');
    expect(firstOccurrenceFrom(rule, '2026-03-01')).toBeNull();
  });
});

describe('addDays', () => {
  it('soma dias atravessando mês, ano e 29/02', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});
