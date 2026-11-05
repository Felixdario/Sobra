import { durations, springs } from '@sobra/tokens';
import { useEffect, useState, type ReactNode } from 'react';
import {
  BackHandler,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { announce } from '../lib/a11y';
import { project, rubberband } from '../lib/gesture';
import { makeStyles } from '../theme/makeStyles';
import { useTheme } from '../theme/ThemeProvider';

type Props = {
  open: boolean;
  onClose: () => void;
  /** Called once the close motion has settled (content can unmount). */
  onClosed?: () => void;
  label: string;
  /** Drag area (grabber + header). The rest of the sheet keeps its own touches. */
  header: ReactNode;
  /** Pinned under the content (the sheet's main action stays visible at any text size). */
  footer?: ReactNode;
  children: ReactNode;
};

/**
 * Bottom sheet driven by one shared value on the UI thread. Opening and closing are springs from
 * the current on-screen position (`springs.sheet`), so a sheet grabbed mid-flight follows the
 * finger and a reopened one reverses without a jump. Release hands the finger's velocity to the
 * spring and decides by projected momentum, not distance. Reduce motion: a fast crossfade, and
 * a drag released short of closing returns in 120ms without a spring. No haptic on the snap
 * back: it happens on every small drag and would be noise.
 */
export function BottomSheet({ open, onClose, onClosed, label, header, footer, children }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(open);
  const translateY = useSharedValue(windowHeight);
  const fade = useSharedValue(0);
  const sheetHeight = useSharedValue(windowHeight);
  const dragStart = useSharedValue(0);
  const releaseVelocity = useSharedValue(0);

  if (open && !mounted) setMounted(true);

  // iOS lays the keyboard over the window; the sheet rises above it so a focused field stays in
  // view (Android resizes the window itself, adjustResize).
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'ios' || !open) return;
    const show = Keyboard.addListener('keyboardWillShow', (event) =>
      setKeyboardHeight(event.endCoordinates.height),
    );
    const hide = Keyboard.addListener('keyboardWillHide', () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [open]);

  // Screen readers: say which sheet opened; the escape gesture (two-finger Z) closes it.
  useEffect(() => {
    if (open) announce(label);
  }, [open, label]);

  useEffect(() => {
    if (!mounted) return;
    const settled = () => {
      setMounted(false);
      onClosed?.();
    };
    if (reduced) {
      // Crossfade in place: a sheet dragged halfway fades from where the finger left it.
      if (open) translateY.set(0);
      fade.set(
        withTiming(open ? 1 : 0, { duration: durations.fast }, (finished) => {
          if (finished && !open) scheduleOnRN(settled);
        }),
      );
      return;
    }
    fade.set(1);
    const velocity = releaseVelocity.get();
    releaseVelocity.set(0);
    translateY.set(
      open
        ? withSpring(0, springs.sheet)
        : withSpring(
            sheetHeight.get(),
            { ...springs.sheet, velocity, overshootClamping: true },
            (finished) => {
              if (finished) scheduleOnRN(settled);
            },
          ),
    );
  }, [open, mounted, reduced, translateY, fade, sheetHeight, releaseVelocity, onClosed]);

  useEffect(() => {
    if (!open || Platform.OS === 'web') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [open, onClose]);

  const pan = usePanGesture({
    activeOffsetY: [-10, 10],
    onActivate: () => {
      dragStart.set(translateY.get());
    },
    onUpdate: (event) => {
      const next = dragStart.get() + event.translationY;
      translateY.set(next >= 0 ? next : rubberband(next, sheetHeight.get()));
    },
    onDeactivate: (event) => {
      const height = sheetHeight.get();
      const projected = translateY.get() + project(event.velocityY);
      if (projected > height * 0.5) {
        releaseVelocity.set(event.velocityY);
        scheduleOnRN(onClose);
        return;
      }
      translateY.set(
        reduced
          ? withTiming(0, { duration: durations.fast })
          : withSpring(0, { ...springs.sheet, velocity: event.velocityY }),
      );
    },
  });

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: fade.get(),
    transform: [{ translateY: translateY.get() }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity:
      fade.get() *
      interpolate(translateY.get(), [0, sheetHeight.get()], [1, 0], Extrapolation.CLAMP),
  }));

  if (!mounted) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={open ? 'auto' : 'none'}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Fechar"
        />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        accessibilityLabel={label}
        onAccessibilityEscape={onClose}
        onLayout={(event) => sheetHeight.set(event.nativeEvent.layout.height)}
        style={[
          styles.sheet,
          keyboardHeight > 0
            ? {
                bottom: keyboardHeight,
                maxHeight: windowHeight - keyboardHeight - insets.top,
                paddingBottom: theme.space[2],
              }
            : { paddingBottom: insets.bottom + theme.space[2] },
          sheetStyle,
        ]}
      >
        <GestureDetector gesture={pan}>
          <View>
            <View style={styles.grabber} />
            {header}
          </View>
        </GestureDetector>
        {/* Scrolls only when the content is taller than the screen (large text, small phones). */}
        <ScrollView
          style={styles.body}
          bounces={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          {children}
        </ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </Animated.View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  backdrop: { backgroundColor: t.colors.bg.overlay },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '96%',
    paddingTop: t.space[2],
    paddingHorizontal: t.layout.phoneMargin,
    borderTopLeftRadius: t.radii.sheet,
    borderTopRightRadius: t.radii.sheet,
    backgroundColor: t.colors.bg.surface,
    ...t.shadows.overlay,
  },
  body: { flexGrow: 0, flexShrink: 1 },
  footer: { paddingTop: t.space[3], gap: t.space[1] },
  grabber: {
    alignSelf: 'center',
    width: t.space[10],
    height: t.space[1],
    borderRadius: t.radii.full,
    backgroundColor: t.colors.border.default,
    marginBottom: t.space[2],
  },
}));
