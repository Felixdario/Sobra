import { durations, springs } from '@financas/tokens';
import { Pencil, Trash2 } from 'lucide-react-native';
import { createContext, use, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { project, rubberband } from '../../lib/gesture';
import { haptics } from '../../lib/haptics';
import { makeStyles } from '../../theme/makeStyles';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from '../../ui/AppText';
import { ICON_SIZE, ICON_STROKE } from '../../ui/icons';

/** Past this share of the row, letting go deletes without tapping "Apagar". */
const FULL_SWIPE = 0.6;
/** Horizontal intent before the row moves; vertical intent hands the touch to the list. */
const ACTIVATE_X = 12;
const FAIL_Y = 8;

type Closer = () => void;

/** One open row at a time; scrolling the list closes it. */
type SwipeCoordinator = { claim: (id: string, close: Closer) => void; closeAll: () => void };

const SwipeContext = createContext<SwipeCoordinator | null>(null);

export function SwipeProvider({ children }: { children: ReactNode }) {
  const open = useRef<{ id: string; close: Closer } | null>(null);
  const value = useMemo<SwipeCoordinator>(
    () => ({
      claim: (id, close) => {
        if (open.current && open.current.id !== id) open.current.close();
        open.current = { id, close };
      },
      closeAll: () => {
        open.current?.close();
        open.current = null;
      },
    }),
    [],
  );
  return <SwipeContext value={value}>{children}</SwipeContext>;
}

export function useSwipeCoordinator(): SwipeCoordinator {
  const value = use(SwipeContext);
  if (!value) throw new Error('useSwipeCoordinator precisa de <SwipeProvider>');
  return value;
}

type Props = {
  id: string;
  label: string;
  onEdit: () => void;
  onDelete: () => void;
  onLongPress: () => void;
  /** Optimistic rows (not yet on the server) can't be edited or deleted. */
  disabled?: boolean;
  children: ReactNode;
};

/**
 * Swipe left reveals "Apagar" (all the way deletes, with a haptic at the threshold); swipe right
 * reveals "Editar". The row follows the finger 1:1 on the UI thread, resists past its edges, and
 * the release hands the finger's velocity to `springs.swipe`, snapping by projected momentum.
 * Screen readers get the same actions as accessibility actions, and a long press opens a menu.
 */
export function SwipeableRow({
  id,
  label,
  onEdit,
  onDelete,
  onLongPress,
  disabled = false,
  children,
}: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const coordinator = useSwipeCoordinator();
  const reduced = useReducedMotion();
  const action = theme.space[20];
  const translateX = useSharedValue(0);
  const start = useSharedValue(0);
  const width = useSharedValue(0);
  const armed = useSharedValue(false);

  const settle = useCallback(
    (target: number, velocity = 0, done?: () => void) => {
      'worklet';
      const finish = (finished?: boolean) => {
        'worklet';
        if (finished && done) scheduleOnRN(done);
      };
      translateX.set(
        reduced
          ? withTiming(target, { duration: durations.fast }, finish)
          : withSpring(
              target,
              { ...springs.swipe, velocity, overshootClamping: target !== 0 && !!done },
              finish,
            ),
      );
    },
    [reduced, translateX],
  );

  const close = useCallback(() => settle(0), [settle]);
  const claim = useCallback(() => coordinator.claim(id, close), [coordinator, id, close]);

  const pan = usePanGesture({
    enabled: !disabled,
    activeOffsetX: [-ACTIVATE_X, ACTIVATE_X],
    failOffsetY: [-FAIL_Y, FAIL_Y],
    onActivate: () => {
      start.set(translateX.get());
      scheduleOnRN(claim);
    },
    onUpdate: (event) => {
      const rowWidth = width.get();
      let x = start.get() + event.translationX;
      if (x > action) x = action + rubberband(x - action, rowWidth);
      if (x < -rowWidth) x = -rowWidth + rubberband(x + rowWidth, rowWidth);
      translateX.set(x);
      const past = x < -rowWidth * FULL_SWIPE;
      if (past !== armed.get()) {
        armed.set(past);
        scheduleOnRN(haptics.impact);
      }
    },
    onDeactivate: (event) => {
      const rowWidth = width.get();
      const projected = translateX.get() + project(event.velocityX);
      if (armed.get() || projected < -rowWidth * 1.5) {
        armed.set(false);
        settle(-rowWidth, event.velocityX, onDelete);
        return;
      }
      const target = projected < -action / 2 ? -action : projected > action / 2 ? action : 0;
      settle(target, event.velocityX);
    },
  });

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.get() }] }));

  const run = (handler: () => void) => () => {
    close();
    handler();
  };

  return (
    <View
      style={styles.wrap}
      onLayout={(event) => width.set(event.nativeEvent.layout.width)}
      accessible
      accessibilityLabel={label}
      accessibilityHint={disabled ? 'Ainda salvando.' : 'Tem ações: editar e apagar.'}
      accessibilityActions={
        disabled
          ? []
          : [
              { name: 'edit', label: 'Editar' },
              { name: 'delete', label: 'Apagar' },
              { name: 'longpress', label: 'Mais ações' },
            ]
      }
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'edit') onEdit();
        if (event.nativeEvent.actionName === 'delete') onDelete();
        if (event.nativeEvent.actionName === 'longpress') onLongPress();
      }}
    >
      <View style={StyleSheet.absoluteFill} importantForAccessibility="no-hide-descendants">
        <View style={styles.actions}>
          <Pressable
            onPress={run(onEdit)}
            style={[styles.action, styles.edit, { width: action }]}
            accessibilityElementsHidden
          >
            <Pencil
              size={ICON_SIZE.row}
              color={theme.colors.action.onSecondary}
              strokeWidth={ICON_STROKE}
            />
            <AppText variant="caption" color={theme.colors.action.onSecondary}>
              Editar
            </AppText>
          </Pressable>
          <View style={[styles.fill, styles.edit]} />
          <View style={[styles.fill, styles.deleteFill]} />
          <Pressable
            onPress={run(onDelete)}
            style={[styles.action, styles.delete, { width: action }]}
            accessibilityElementsHidden
          >
            <Trash2
              size={ICON_SIZE.row}
              color={theme.colors.action.onDestructive}
              strokeWidth={ICON_STROKE}
            />
            <AppText variant="caption" color={theme.colors.action.onDestructive}>
              Apagar
            </AppText>
          </Pressable>
        </View>
      </View>
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.row, rowStyle]}>
          <Pressable
            onLongPress={disabled ? undefined : onLongPress}
            delayLongPress={400}
            importantForAccessibility="no"
          >
            {children}
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: { overflow: 'hidden', backgroundColor: t.colors.bg.surface },
  actions: { flex: 1, flexDirection: 'row' },
  action: { alignItems: 'center', justifyContent: 'center', gap: t.space[1] },
  edit: { backgroundColor: t.colors.action.secondary },
  delete: { backgroundColor: t.colors.action.destructive },
  fill: { flex: 1 },
  deleteFill: { backgroundColor: t.colors.action.destructive },
  row: { backgroundColor: t.colors.bg.surface },
}));
