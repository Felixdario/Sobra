import { describe, expect, it, vi } from 'vitest';
import {
  isMonthKey,
  lastNMonths,
  monthKey,
  monthRange,
  nextMonth,
  parseMonthKey,
  previousMonth,
  toMonthKey,
} from './month';

describe('MonthKey', () => {
  it('valida o formato YYYY-MM', () => {
    expect(isMonthKey('2026-11')).toBe(true);
    expect(isMonthKey('2026-01')).toBe(true);
    for (const value of [
      '2026-13',
      '2026-00',
      '2026-1',
      '26-11',
      '0999-01',
      '2026-11-01',
      202611,
    ]) {
      expect(isMonthKey(value)).toBe(false);
    }
    expect(monthKey('2026-11')).toBe('2026-11');
    expect(() => monthKey('2026-13')).toThrow(RangeError);
  });

  it('separa ano e mês', () => {
    expect(parseMonthKey(monthKey('2026-02'))).toEqual({ year: 2026, month: 2 });
  });
});

describe('toMonthKey', () => {
  it('usa o mês de São Paulo, não o de UTC', () => {
    // 02:30 UTC de 1º de dezembro ainda é 23:30 de 30 de novembro em SP.
    expect(toMonthKey(new Date('2026-12-01T02:30:00Z'))).toBe('2026-11');
    expect(toMonthKey(new Date('2026-12-01T02:59:59.999Z'))).toBe('2026-11');
    expect(toMonthKey(new Date('2026-12-01T03:00:00Z'))).toBe('2026-12');
    expect(toMonthKey(new Date('2027-01-01T01:00:00Z'))).toBe('2026-12');
  });

  it('respeita o horário de verão histórico (UTC-2)', () => {
    expect(toMonthKey(new Date('2018-12-01T01:59:59Z'))).toBe('2018-11');
    expect(toMonthKey(new Date('2018-12-01T02:00:00Z'))).toBe('2018-12');
  });
});

describe('monthRange', () => {
  it('vai da meia-noite do dia 1 em SP até a do mês seguinte (exclusivo)', () => {
    const { start, end } = monthRange(monthKey('2026-11'));
    expect(start.toISOString()).toBe('2026-11-01T03:00:00.000Z');
    expect(end.toISOString()).toBe('2026-12-01T03:00:00.000Z');
  });

  it('vira o ano em dezembro', () => {
    const { start, end } = monthRange(monthKey('2026-12'));
    expect(start.toISOString()).toBe('2026-12-01T03:00:00.000Z');
    expect(end.toISOString()).toBe('2027-01-01T03:00:00.000Z');
  });

  it('cobre fevereiro de anos bissextos e não bissextos', () => {
    const day = 24 * 60 * 60 * 1000;
    const leap = monthRange(monthKey('2028-02'));
    expect(leap.end.toISOString()).toBe('2028-03-01T03:00:00.000Z');
    expect((leap.end.getTime() - leap.start.getTime()) / day).toBe(29);
    const common = monthRange(monthKey('2026-02'));
    expect((common.end.getTime() - common.start.getTime()) / day).toBe(28);
    const centuryLeap = monthRange(monthKey('2000-02'));
    expect(centuryLeap.end.toISOString()).toBe('2000-03-01T03:00:00.000Z');
  });

  it('o instante que é novembro em SP cai dentro do intervalo de novembro', () => {
    const instant = new Date('2026-12-01T02:30:00Z');
    const { start, end } = monthRange(toMonthKey(instant));
    expect(instant >= start && instant < end).toBe(true);
  });
});

describe('previousMonth / nextMonth', () => {
  it('andam um mês, virando o ano', () => {
    expect(previousMonth(monthKey('2026-11'))).toBe('2026-10');
    expect(previousMonth(monthKey('2026-01'))).toBe('2025-12');
    expect(nextMonth(monthKey('2026-11'))).toBe('2026-12');
    expect(nextMonth(monthKey('2026-12'))).toBe('2027-01');
  });
});

describe('lastNMonths', () => {
  it('lista os n meses até o informado, do mais antigo ao mais recente', () => {
    expect(lastNMonths(3, monthKey('2026-02'))).toEqual(['2025-12', '2026-01', '2026-02']);
    expect(lastNMonths(1, monthKey('2026-02'))).toEqual(['2026-02']);
    expect(lastNMonths(0, monthKey('2026-02'))).toEqual([]);
    expect(lastNMonths(13, monthKey('2026-12'))[0]).toBe('2025-12');
  });

  it('aceita um instante e usa o mês dele em SP', () => {
    expect(lastNMonths(2, new Date('2026-12-01T02:30:00Z'))).toEqual(['2026-10', '2026-11']);
  });

  it('usa o mês atual em SP por padrão', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-12-01T02:30:00Z')); // ainda 30/11 em SP
      expect(lastNMonths(2)).toEqual(['2026-10', '2026-11']);
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([-1, 1.5, Number.NaN])('rejeita n = %s', (n) => {
    expect(() => lastNMonths(n, monthKey('2026-02'))).toThrow(RangeError);
  });
});
