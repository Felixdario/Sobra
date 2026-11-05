/**
 * Calculator-style amount entry in cents: digits fill from the right, so "1", "2", "5" reads
 * R$ 0,01 → R$ 0,12 → R$ 1,25. No comma key and no float anywhere.
 */
export type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
export type KeypadKey = Digit | '00' | 'backspace' | 'clear';

/** Up to R$ 99.999.999,99. */
export const MAX_DIGITS = 10;
export const MAX_CENTS = 10 ** MAX_DIGITS - 1;

export type KeyResult = { value: number; accepted: boolean };

function append(value: number, digits: string): KeyResult {
  const next = Number.parseInt(`${value}${digits}`, 10);
  if (next > MAX_CENTS) return { value, accepted: false };
  return { value: next, accepted: true };
}

export function applyKey(value: number, key: KeypadKey): KeyResult {
  switch (key) {
    case 'backspace':
      return { value: Math.floor(value / 10), accepted: value > 0 };
    case 'clear':
      return { value: 0, accepted: value > 0 };
    default:
      return append(value, key);
  }
}

export function applyKeys(keys: readonly KeypadKey[], start = 0): number {
  return keys.reduce((value, key) => applyKey(value, key).value, start);
}
