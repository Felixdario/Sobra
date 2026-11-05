/*
 * Gesture physics shared by the sheet, the swipeable row and the month swipe (apple-design,
 * "Designing Fluid Interfaces"). Worklets: they run on the UI thread inside gesture callbacks.
 */

/** Where a flick would come to rest: Apple's exponential decay (§6), not v²/2a. */
export function project(velocity: number, decelerationRate = 0.998) {
  'worklet';
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/** The further past the edge, the less the element follows (§9). */
export function rubberband(overshoot: number, dimension: number, constant = 0.55) {
  'worklet';
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}
