import { pressScaleStyles } from './PressableScale';

describe('PressableScale', () => {
  it('passes the press easing as an easing object, not a CSS string', () => {
    // Native Reanimated throws on `cubic-bezier(...)` strings (only predefined names are
    // accepted); the Jest mock and the web build both let them through, so guard it here.
    const easing = pressScaleStyles.base.transitionTimingFunction;

    expect(easing).toBeDefined();
    expect(typeof easing).not.toBe('string');
  });
});
