import { durations, easings } from '@financas/tokens';
import { CircleAlert } from 'lucide-react-native';
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { View } from 'react-native';
import Animated, { Easing, FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { makeStyles } from '../theme/makeStyles';
import { useTheme } from '../theme/ThemeProvider';
import { AppText } from './AppText';
import { Button } from './Button';
import { ICON_SIZE, ICON_STROKE } from './icons';

type ToastInput = {
  message: string;
  tone?: 'neutral' | 'error';
  action?: { label: string; onPress: () => void };
};

type ToastItem = ToastInput & { id: number };

type ToastApi = { show: (toast: ToastInput) => void; hide: () => void };

const ToastContext = createContext<ToastApi | null>(null);

const VISIBLE_MS = { neutral: 4000, error: 6000 } as const;

// animate-expo "Toast": enters and leaves along the same path, exit faster than entry.
const ENTER = FadeInDown.duration(durations.moderate).easing(Easing.bezier(...easings.enter));
const EXIT = FadeOutDown.duration(durations.base).easing(Easing.bezier(...easings.exit));

export function ToastProvider({
  children,
  bottomOffset = 0,
}: {
  children: ReactNode;
  bottomOffset?: number;
}) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const counter = useRef(0);

  const api = useMemo<ToastApi>(
    () => ({
      show: (input) => {
        counter.current += 1;
        setToast({ ...input, id: counter.current });
      },
      hide: () => setToast(null),
    }),
    [],
  );

  return (
    <ToastContext value={api}>
      {children}
      {toast ? (
        <ToastView key={toast.id} toast={toast} onDone={api.hide} bottomOffset={bottomOffset} />
      ) : null}
    </ToastContext>
  );
}

function ToastView({
  toast,
  onDone,
  bottomOffset,
}: {
  toast: ToastItem;
  onDone: () => void;
  bottomOffset: number;
}) {
  const theme = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const tone = toast.tone ?? 'neutral';

  useEffect(() => {
    const timer = setTimeout(onDone, VISIBLE_MS[tone]);
    return () => clearTimeout(timer);
  }, [onDone, tone]);

  const runAction = useCallback(() => {
    toast.action?.onPress();
    onDone();
  }, [toast, onDone]);

  return (
    <Animated.View
      entering={ENTER}
      exiting={EXIT}
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: insets.bottom + bottomOffset + theme.space[4] }]}
    >
      <View style={styles.toast} accessibilityRole="alert" accessibilityLiveRegion="assertive">
        {tone === 'error' ? (
          <CircleAlert
            size={ICON_SIZE.row}
            color={theme.colors.status.danger}
            strokeWidth={ICON_STROKE}
          />
        ) : null}
        <AppText variant="bodySm" style={styles.message}>
          {toast.message}
        </AppText>
        {toast.action ? (
          <Button
            variant="ghost"
            label={toast.action.label}
            onPress={runAction}
            style={styles.action}
          />
        ) : null}
      </View>
    </Animated.View>
  );
}

export function useToast(): ToastApi {
  const value = use(ToastContext);
  if (!value) throw new Error('useToast precisa de <ToastProvider>');
  return value;
}

const useStyles = makeStyles((t) => ({
  wrap: { position: 'absolute', left: t.layout.phoneMargin, right: t.layout.phoneMargin },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[3],
    minHeight: t.layout.rowTall,
    paddingLeft: t.space[4],
    paddingRight: t.space[1],
    borderRadius: t.radii.lg,
    backgroundColor: t.colors.bg.raised,
    borderWidth: 1,
    borderColor: t.colors.border.subtle,
    ...t.shadows.raised,
  },
  message: { flex: 1, paddingVertical: t.space[3] },
  action: { paddingHorizontal: t.space[3] },
}));
