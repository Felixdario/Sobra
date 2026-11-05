import { space } from '@financas/tokens';
import { Defs, Line, Pattern, Rect } from 'react-native-svg';

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
      <Pattern
        id={id}
        patternUnits="userSpaceOnUse"
        width={period}
        height={period}
        patternTransform="rotate(45)"
      >
        <Rect width={period} height={period} fill={background} />
        <Line x1={0} y1={0} x2={0} y2={period} stroke={color} strokeWidth={space[1]} />
      </Pattern>
    </Defs>
  );
}

/** SVG ids are document-global on the web: React's useId has colons, which url(#…) rejects. */
export function svgId(reactId: string): string {
  return reactId.replace(/[^a-zA-Z0-9_-]/g, '');
}
