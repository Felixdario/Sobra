import { durations, easings } from '@sobra/tokens';
import { useState, type ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { cubicBezier, useReducedMotion } from 'react-native-reanimated';

export type PressableScaleProps = Omit<PressableProps, 'children' | 'style'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Layout of the touch area itself (flex, alignment); `style` dresses the visual. */
  containerStyle?: StyleProp<ViewStyle>;
  /** Style applied while the finger is down (instant, no transition): e.g. a pressed fill. */
  pressedStyle?: StyleProp<ViewStyle>;
};

const PRESS_RETENTION = 16;

/**
 * Feedback on press-in, commit on press-out (animate-expo "Press feedback"): 3% scale in the
 * fast duration with the tokens' ease-out, as a Reanimated CSS transition (UI thread, no shared
 * value for a two-state change). CSS transitions don't read Reduce Motion on their own, so with
 * it on the scale is dropped and the pressed fill alone gives the feedback.
 */
export function PressableScale({
  children,
  style,
  containerStyle,
  pressedStyle,
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}: PressableScaleProps) {
  const [pressed, setPressed] = useState(false);
  const reduced = useReducedMotion();
  return (
    <Pressable
      {...rest}
      disabled={disabled}
      style={containerStyle}
      pressRetentionOffset={PRESS_RETENTION}
      onPressIn={(event) => {
        setPressed(true);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setPressed(false);
        onPressOut?.(event);
      }}
    >
      <Animated.View
        style={[
          !reduced && pressScaleStyles.base,
          style,
          pressed && !disabled && [!reduced && pressScaleStyles.pressed, pressedStyle],
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

export const pressScaleStyles = {
  base: {
    transform: [{ scale: 1 }],
    transitionProperty: 'transform',
    transitionDuration: durations.fast,
    // Native Reanimated rejects CSS `cubic-bezier(...)` strings (only predefined names); the
    // easing object works on iOS, Android and web alike.
    transitionTimingFunction: cubicBezier(...easings.enter),
  },
  pressed: { transform: [{ scale: 0.97 }] },
} as const;
