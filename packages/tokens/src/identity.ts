/**
 * Identity colors for categories and accounts: the palette of the color picker (web) and the
 * defaults the API seeds for a new user (apps/api/src/modules/auth/defaults.ts). Flat,
 * mid-lightness pigments from the same world as the tokens (azulejo cobalt, ochre, terracotta,
 * flag green). Only ever shown as an 8px square: each pair is apart by ΔE OKLab ≥ 8 and each reads
 * at 3:1 on both surfaces (`identity.test.ts`). No pure red: red means debt.
 */
export const identityColors = [
  { name: 'Cobalto', hex: '#3A64C8' },
  { name: 'Laranja', hex: '#D06A1F' },
  { name: 'Verde', hex: '#2E8B57' },
  { name: 'Rosa', hex: '#B54076' },
  { name: 'Lilás', hex: '#9B6FD0' },
  { name: 'Céu', hex: '#2E8FBF' },
  { name: 'Grafite', hex: '#6B6B66' },
  { name: 'Argila', hex: '#A0785A' },
  { name: 'Terracota', hex: '#B4532A' },
  { name: 'Ameixa', hex: '#8A4FA8' },
  { name: 'Mostarda', hex: '#B28A00' },
  { name: 'Oliva', hex: '#79821D' },
  { name: 'Petróleo', hex: '#1F7A80' },
] as const;

export type IdentityColor = (typeof identityColors)[number];
export type IdentityColorName = IdentityColor['name'];

/** Hex of a palette color by name, so callers reference the palette instead of copying values. */
export function identityHex(name: IdentityColorName): IdentityColor['hex'] {
  const color = identityColors.find((c) => c.name === name);
  if (!color) throw new Error(`Unknown identity color: ${name}`);
  return color.hex;
}
