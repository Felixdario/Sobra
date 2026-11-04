declare const centsBrand: unique symbol;

/** Monetary amount in integer cents (BRL). Never a float. */
export type Cents = number & { readonly [centsBrand]: true };

export function isCents(value: unknown): value is Cents {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

export function cents(value: number): Cents {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`Expected an integer amount of cents, received ${value}`);
  }
  return value as Cents;
}
