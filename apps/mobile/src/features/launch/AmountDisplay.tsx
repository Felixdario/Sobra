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
import { useI18n } from '../../i18n/I18nProvider';
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
 * refused key (at 99,999,999.99 in any currency) nudges the figure sideways; with Reduce Motion it dims for
 * a moment instead, so the refusal never rests on the haptic alone.
 */
export function AmountDisplay({ value, type, rejections }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const i18n = useI18n();
  const reduced = useReducedMotion();
  const nudge = useSharedValue(0);
  const dim = useSharedValue(1);
  const amount = cents(type === 'expense' ? -value : value);
  // Cents in every locale: "1", "2", "5", "0" reads R$ 12,50 in pt-BR and $12.50 in en-US.
  const shown = value === 0 ? i18n.money(cents(0)) : i18n.money(amount, 'always');
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
      accessibilityLabel={i18n.t('mobile.launch.amountA11y', {
        amount: i18n.speakMoney(cents(value)),
      })}
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
