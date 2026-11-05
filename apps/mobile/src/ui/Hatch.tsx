import { space } from '@financas/tokens';
import { Defs, Path, Pattern, Rect } from 'react-native-svg';

/**
 * Seamless 45° tile: the main diagonal plus the two corner pieces that continue the neighbours'
 * stripes. Drawn already diagonal because react-native-svg on iOS clips rotated tiles
 * (`patternTransform`) into a sawtooth.
 */
export function hatchTilePath(period: number): string {
  const q = period / 4;
  return [
    `M0,${period} L${period},0`,
    `M${-q},${q} L${q},${-q}`,
    `M${period - q},${period + q} L${period + q},${period - q}`,
  ].join(' ');
}

/** 45° stripes (dataviz texture: diagonal only, never horizontal/vertical). */
export function HatchPattern({
  id,
  color,
  background,
}: {
  id: string;
  color: string;
  background: string;
}) {
  const period = space[2];
  return (
    <Defs>
      <Pattern id={id} patternUnits="userSpaceOnUse" width={period} height={period}>
        <Rect width={period} height={period} fill={background} />
        <Path d={hatchTilePath(period)} stroke={color} strokeWidth={space[1] / 2} />
      </Pattern>
    </Defs>
  );
}

/** SVG ids are document-global on the web: React's useId has colons, which url(#…) rejects. */
export function svgId(reactId: string): string {
  return reactId.replace(/[^a-zA-Z0-9_-]/g, '');
}
