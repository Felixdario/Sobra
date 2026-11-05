import { breakpoints } from '@sobra/tokens';
import { useMediaQuery } from './useMediaQuery';

/** At or above the 768px "medium" breakpoint: tables instead of stacked lists. */
export function useWide(): boolean {
  return useMediaQuery(`(min-width: ${breakpoints.medium}px)`);
}
