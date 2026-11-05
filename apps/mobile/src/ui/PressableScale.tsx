import { cubicBezierCss, durations, easings } from '@financas/tokens';
import { useState, type ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

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
 * value for a two-state change). The system's reduce-motion setting turns the transition off.
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
        style={[styles.base, style, pressed && !disabled && [styles.pressed, pressedStyle]]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

const styles = {
  base: {
    transform: [{ scale: 1 }],
    transitionProperty: 'transform',
    transitionDuration: durations.fast,
    transitionTimingFunction: cubicBezierCss(easings.enter),
  },
  pressed: { transform: [{ scale: 0.97 }] },
} as const;
