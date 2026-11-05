import { applyKey, applyKeys, MAX_CENTS, type KeypadKey } from './centsKeypad';

const keys = (...values: KeypadKey[]) => values;

describe('teclado em centavos', () => {
  it('preenche da direita: 1, 2, 5 vira R$ 1,25', () => {
    expect(applyKeys(keys('1'))).toBe(1);
    expect(applyKeys(keys('1', '2'))).toBe(12);
    expect(applyKeys(keys('1', '2', '5'))).toBe(125);
  });

  it('00 multiplica por cem e zeros à esquerda não contam', () => {
    expect(applyKeys(keys('0', '0', '5', '00'))).toBe(500);
    expect(applyKeys(keys('00'))).toBe(0);
  });

  it('apagar tira o último dígito e zerar volta a R$ 0,00', () => {
    expect(applyKeys(keys('1', '2', '5', 'backspace'))).toBe(12);
    expect(applyKeys(keys('1', '2', '5', 'clear'))).toBe(0);
    expect(applyKey(0, 'backspace')).toEqual({ value: 0, accepted: false });
  });

  it('recusa o dígito que passaria do limite e mantém o valor', () => {
    const full = applyKeys(keys('9', '9', '9', '9', '9', '9', '9', '9', '9', '9'));
    expect(full).toBe(MAX_CENTS);
    expect(applyKey(full, '1')).toEqual({ value: MAX_CENTS, accepted: false });
    expect(applyKey(full, 'backspace').value).toBe(999_999_999);
  });
});
