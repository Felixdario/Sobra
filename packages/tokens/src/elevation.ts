import type { ThemeMode } from './themes';

/**
 * Neutral shadow description that both the web (box-shadow) and React Native (shadow* props +
 * Android `elevation`) can be derived from. Surfaces are flat at rest: only things that float
 * get a shadow.
 */
export type ShadowToken = {
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  color: string;
  opacity: number;
  /** Android `elevation` equivalent. */
  androidElevation: number;
};

export type ElevationLevel = 'flat' | 'raised' | 'overlay';

const none: ShadowToken = {
  offsetX: 0,
  offsetY: 0,
  blur: 0,
  spread: 0,
  color: '#000000',
  opacity: 0,
  androidElevation: 0,
};

export const elevation: Record<ThemeMode, Record<ElevationLevel, ShadowToken>> = {
  light: {
    flat: none,
    /** Menus, popovers, the dragged row. */
    raised: {
      offsetX: 0,
      offsetY: 4,
      blur: 12,
      spread: -2,
      color: '#0E0E0D',
      opacity: 0.12,
      androidElevation: 4,
    },
    /** Dialogs and bottom sheets. */
    overlay: {
      offsetX: 0,
      offsetY: 16,
      blur: 40,
      spread: -8,
      color: '#0E0E0D',
      opacity: 0.2,
      androidElevation: 12,
    },
  },
  dark: {
    flat: none,
    // On dark, depth comes from the lighter `bg.raised` tone; the shadow only separates edges.
    raised: {
      offsetX: 0,
      offsetY: 4,
      blur: 12,
      spread: -2,
      color: '#000000',
      opacity: 0.4,
      androidElevation: 4,
    },
    overlay: {
      offsetX: 0,
      offsetY: 16,
      blur: 40,
      spread: -8,
      color: '#000000',
      opacity: 0.56,
      androidElevation: 12,
    },
  },
};
