import { cents } from '@sobra/shared';
import { durations, easings } from '@sobra/tokens';
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
import { useFigureStyle } from '../../ui/useFigureStyle';

const EASE_OUT = Easing.bezier(...easings.enter);
/** The figure steps capped by the theme, so the web simulation and native agree. */
const STEPS = ['figureXl', 'figureLg', 'figureMd'] as const;

type Props = {
  value: number;
  type: 'income' | 'expense';
  /** Increments each time a key is refused, to nudge the figure. */
  rejections: number;
};

/**
 * The amount being typed. Digits swap in place with no motion: typing is the most frequent
 * action in the app, and an animation per key only flickers (improve-animations, ADR-032). A
 * refused key (at R$ 99.999.999,99) nudges the figure sideways; with Reduce Motion it dims for
 * a moment instead, so the refusal never rests on the haptic alone.
 */
export function AmountDisplay({ value, type, rejections }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const nudge = useSharedValue(0);
  const dim = useSharedValue(1);
  const amount = cents(type === 'expense' ? -value : value);
  const shown = value === 0 ? formatMoney(cents(0)) : formatMoney(amount, 'always');
  const fit = useFigureStyle(shown, STEPS);

  useEffect(() => {
    if (rejections === 0) return;
    const leg = { duration: durations.fast / 3, easing: EASE_OUT };
    if (reduced) {
      dim.set(
        withSequence(withTiming(0.5, leg), withTiming(1, { ...leg, duration: durations.fast })),
      );
      return;
    }
    const step = theme.space[1];
    nudge.set(withSequence(withTiming(step, leg), withTiming(-step, leg), withTiming(0, leg)));
  }, [rejections, reduced, nudge, dim, theme.space]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: dim.get(),
    transform: [{ translateX: nudge.get() }],
  }));

  return (
    <Animated.Text
      testID="amount"
      accessibilityRole="text"
      accessibilityLabel={`Valor: ${speakMoney(cents(value))}`}
      onLayout={fit.onLayout}
      maxFontSizeMultiplier={fit.maxFontSizeMultiplier}
      allowFontScaling={fit.allowFontScaling}
      style={[
        theme.text[fit.variant],
        styles.amount,
        {
          color:
            value === 0
              ? theme.colors.money.zero
              : type === 'income'
                ? theme.colors.money.income
                : theme.colors.money.expense,
        },
        fit.fitStyle,
        animatedStyle,
      ]}
    >
      {shown}
    </Animated.Text>
  );
}

const useStyles = makeStyles(() => ({
  amount: { textAlign: 'right' },
}));
