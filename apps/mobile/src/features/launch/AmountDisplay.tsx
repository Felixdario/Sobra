import { cents } from '@financas/shared';
import { durations, easings } from '@financas/tokens';
import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { formatMoney, speakMoney } from '../../lib/money';
import { makeStyles } from '../../theme/makeStyles';
import { useTheme } from '../../theme/ThemeProvider';

const EASE_OUT = Easing.bezier(...easings.enter);
const LONG_AMOUNT = 12;

type Props = {
  value: number;
  type: 'income' | 'expense';
  /** Increments each time a key is refused, to nudge the figure. */
  rejections: number;
};

/**
 * The amount being typed. Each change settles in from a 4px drop at 55% opacity in the fast
 * duration (the eye follows the new digit without the number "jumping"); a refused key nudges
 * it sideways. Reduce motion: plain swap, no nudge.
 */
export function AmountDisplay({ value, type, rejections }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const settle = useSharedValue(1);
  const nudge = useSharedValue(0);
  const amount = cents(type === 'expense' ? -value : value);
  const label = formatMoney(amount, 'always');

  useEffect(() => {
    if (reduced) return;
    settle.set(0);
    settle.set(withTiming(1, { duration: durations.fast, easing: EASE_OUT }));
  }, [value, reduced, settle]);

  useEffect(() => {
    if (reduced || rejections === 0) return;
    const step = theme.space[1];
    const leg = { duration: durations.fast / 3, easing: EASE_OUT };
    nudge.set(withSequence(withTiming(step, leg), withTiming(-step, leg), withTiming(0, leg)));
  }, [rejections, reduced, nudge, theme.space]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + 0.45 * settle.get(),
    transform: [{ translateY: (1 - settle.get()) * theme.space[1] }, { translateX: nudge.get() }],
  }));

  return (
    <Animated.Text
      testID="amount"
      accessibilityRole="text"
      accessibilityLabel={`Valor: ${speakMoney(cents(value))}`}
      accessibilityLiveRegion="polite"
      numberOfLines={1}
      style={[
        label.length > LONG_AMOUNT ? theme.text.figureLg : theme.text.figureXl,
        styles.amount,
        {
          color:
            value === 0
              ? theme.colors.money.zero
              : type === 'income'
                ? theme.colors.money.income
                : theme.colors.money.expense,
        },
        animatedStyle,
      ]}
    >
      {value === 0 ? formatMoney(cents(0)) : label}
    </Animated.Text>
  );
}

const useStyles = makeStyles(() => ({
  amount: { textAlign: 'right' },
}));
