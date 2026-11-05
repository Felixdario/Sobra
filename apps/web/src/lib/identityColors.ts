/**
 * Identity colors for categories and accounts: the palette of the color picker and the defaults of
 * the API (apps/api/src/modules/auth/defaults.ts). Flat, mid-lightness pigments from the same
 * world as the tokens (azulejo cobalt, ochre, terracotta, flag green). Only ever shown as an
 * 8px square: each pair is apart by ΔE OKLab ≥ 8 and each reads at 3:1 on both surfaces
 * (`scripts/identity-palette.ts`, `identityColors.test.ts`). No pure red: red means debt.
 */
export const IDENTITY_COLORS = [
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

export type IdentityColor = (typeof IDENTITY_COLORS)[number];
