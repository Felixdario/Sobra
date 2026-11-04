/** mulberry32: tiny 32-bit PRNG. The same seed always yields the same sequence. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Random = {
  /** Float in [0, 1). */
  next: () => number;
  /** Integer in [min, max], both inclusive. */
  int: (min: number, max: number) => number;
  chance: (probability: number) => boolean;
  pick: <T>(items: readonly T[]) => T;
  shuffle: <T>(items: readonly T[]) => T[];
  /** Distinct integers in [min, max], ascending. */
  sample: (count: number, min: number, max: number) => number[];
};

export function createRandom(seed: number): Random {
  const next = mulberry32(seed);
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));
  const shuffle = <T>(items: readonly T[]): T[] => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = int(0, i);
      [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
    }
    return copy;
  };
  return {
    next,
    int,
    chance: (probability) => next() < probability,
    pick: <T>(items: readonly T[]): T => {
      const item = items[int(0, items.length - 1)];
      if (item === undefined) throw new RangeError('pick: lista vazia');
      return item;
    },
    shuffle,
    sample: (count, min, max) =>
      shuffle(Array.from({ length: max - min + 1 }, (_, index) => min + index))
        .slice(0, count)
        .sort((a, b) => a - b),
  };
}
