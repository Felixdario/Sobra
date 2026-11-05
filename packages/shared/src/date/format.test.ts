import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatDate, formatMonth, formatRelativeDay } from './format';
import { monthKey } from './month';

describe('formatDate', () => {
  it('formata no padrão pt-BR, no dia de SP', () => {
    expect(formatDate(new Date('2026-11-04T15:00:00Z'))).toBe('4 de nov. de 2026');
    expect(formatDate(new Date('2026-12-01T02:30:00Z'))).toBe('30 de nov. de 2026');
  });
});

describe('formatMonth', () => {
  it('formata por extenso', () => {
    expect(formatMonth(monthKey('2026-11'))).toBe('novembro de 2026');
    expect(formatMonth(monthKey('2027-03'), 'long')).toBe('março de 2027');
  });

  it('formata curto para eixos de gráfico', () => {
    expect(formatMonth(monthKey('2026-11'), 'short')).toBe('nov/26');
    expect(formatMonth(monthKey('2026-05'), 'short')).toBe('mai/26');
    expect(formatMonth(monthKey('2009-02'), 'short')).toBe('fev/09');
    expect(formatMonth(monthKey('2100-12'), 'short')).toBe('dez/00');
  });
});

describe('formatRelativeDay', () => {
  const now = new Date('2026-11-04T15:00:00Z'); // 12:00 em SP

  it('diz "Hoje" para o mesmo dia em SP', () => {
    expect(formatRelativeDay(new Date('2026-11-04T03:00:00Z'), { now })).toBe('Hoje');
    expect(formatRelativeDay(new Date('2026-11-05T02:59:59Z'), { now })).toBe('Hoje');
  });

  it('diz "Ontem" para o dia anterior em SP', () => {
    expect(formatRelativeDay(new Date('2026-11-04T02:59:59Z'), { now })).toBe('Ontem');
    expect(formatRelativeDay(new Date('2026-11-03T03:00:00Z'), { now })).toBe('Ontem');
  });

  it('formata a data nos outros casos', () => {
    expect(formatRelativeDay(new Date('2026-11-03T02:59:59Z'), { now })).toBe('2 de nov. de 2026');
    expect(formatRelativeDay(new Date('2026-11-05T03:00:00Z'), { now })).toBe('5 de nov. de 2026');
  });

  it('considera a virada de mês e ano', () => {
    const newYear = new Date('2027-01-01T12:00:00Z');
    expect(formatRelativeDay(new Date('2026-12-31T12:00:00Z'), { now: newYear })).toBe('Ontem');
    const march1 = new Date('2028-03-01T12:00:00Z');
    expect(formatRelativeDay(new Date('2028-02-29T12:00:00Z'), { now: march1 })).toBe('Ontem');
  });

  describe('usa o relógio do sistema por padrão', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('perto da meia-noite em SP, ainda conta o dia local', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-11-05T02:59:00Z')); // 23:59 de 4/11 em SP
      expect(formatRelativeDay(new Date('2026-11-04T03:00:00Z'))).toBe('Hoje');
      expect(formatRelativeDay(new Date('2026-11-05T02:00:00Z'))).toBe('Hoje');
      expect(formatRelativeDay(new Date('2026-11-04T02:59:00Z'))).toBe('Ontem');
      expect(formatRelativeDay(new Date('2026-11-05T03:00:00Z'))).toBe('5 de nov. de 2026');
    });

    it('logo após a meia-noite em SP, o dia anterior vira "Ontem"', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-11-05T03:00:00Z')); // 00:00 de 5/11 em SP
      expect(formatRelativeDay(new Date('2026-11-05T02:59:00Z'))).toBe('Ontem');
      expect(formatRelativeDay(new Date('2026-11-05T03:00:00Z'))).toBe('Hoje');
    });
  });
});

describe('en-US', () => {
  const en = { locale: 'en-US' } as const;

  it('formatDate em inglês, no dia de SP', () => {
    expect(formatDate(new Date('2026-11-04T15:00:00Z'), en)).toBe('Nov 4, 2026');
    expect(formatDate(new Date('2026-12-01T02:30:00Z'), en)).toBe('Nov 30, 2026');
  });

  it('formatMonth com meses em inglês', () => {
    expect(formatMonth(monthKey('2026-11'), 'long', en)).toBe('November 2026');
    expect(formatMonth(monthKey('2026-05'), 'short', en)).toBe("May '26");
    expect(formatMonth(monthKey('2009-02'), 'short', en)).toBe("Feb '09");
    expect(formatMonth(monthKey('2026-10'), 'month', en)).toBe('October');
  });

  it('formatRelativeDay diz "Today" e "Yesterday"', () => {
    const now = new Date('2026-11-04T15:00:00Z');
    expect(formatRelativeDay(new Date('2026-11-04T03:00:00Z'), { ...en, now })).toBe('Today');
    expect(formatRelativeDay(new Date('2026-11-04T02:59:59Z'), { ...en, now })).toBe('Yesterday');
    expect(formatRelativeDay(new Date('2026-11-03T02:59:59Z'), { ...en, now })).toBe('Nov 2, 2026');
  });
});

describe('formatMonth "month"', () => {
  it('só o nome do mês, para comparações ("vs outubro")', () => {
    expect(formatMonth(monthKey('2026-10'), 'month')).toBe('outubro');
  });
});
