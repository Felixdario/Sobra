type Defined<T> = { [K in keyof T]-?: Exclude<T[K], undefined> };

/** Drops `undefined` keys so a partial update can go straight to Prisma (`exactOptionalPropertyTypes`). */
export function compact<T extends object>(value: T): Partial<Defined<T>> {
  return Object.fromEntries(
    Object.entries(value).filter(([, field]) => field !== undefined),
  ) as Partial<Defined<T>>;
}
