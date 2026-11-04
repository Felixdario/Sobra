import { describe, expect, it } from 'vitest';
import { parseLocalDate, toLocalDateKey } from './day';

describe('toLocalDateKey', () => {
  it('usa o dia de São Paulo, não o de UTC', () => {
    expect(toLocalDateKey(new Date('2026-12-01T02:30:00Z'))).toBe('2026-11-30');
    expect(toLocalDateKey(new Date('2026-12-01T03:00:00Z'))).toBe('2026-12-01');
    expect(toLocalDateKey(new Date('2028-02-29T12:00:00Z'))).toBe('2028-02-29');
  });
});

describe('parseLocalDate', () => {
  it('devolve o instante da meia-noite em SP', () => {
    expect(parseLocalDate('2026-11-04').toISOString()).toBe('2026-11-04T03:00:00.000Z');
    expect(parseLocalDate('2027-01-01').toISOString()).toBe('2027-01-01T03:00:00.000Z');
  });

  it('aceita 29 de fevereiro só em ano bissexto', () => {
    expect(parseLocalDate('2028-02-29').toISOString()).toBe('2028-02-29T03:00:00.000Z');
    expect(parseLocalDate('2000-02-29').toISOString()).toBe('2000-02-29T03:00:00.000Z');
    expect(() => parseLocalDate('2026-02-29')).toThrow(RangeError);
    expect(() => parseLocalDate('1900-02-29')).toThrow(RangeError);
  });

  it('faz ida e volta com toLocalDateKey', () => {
    for (const key of ['2026-01-01', '2026-12-31', '2028-02-29', '2018-11-04']) {
      expect(toLocalDateKey(parseLocalDate(key))).toBe(key);
    }
  });

  it.each([
    '',
    '2026-11-4',
    '2026/11/04',
    '04/11/2026',
    '2026-13-01',
    '2026-04-31',
    '2026-11-04T00:00',
  ])('rejeita "%s"', (key) => {
    expect(() => parseLocalDate(key)).toThrow(RangeError);
  });
});
