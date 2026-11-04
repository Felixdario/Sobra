import { withAlpha } from './color';
import { cobalto, concreto, dataHues, ocre, verde, vermelho } from './primitives';

export type ThemeMode = 'light' | 'dark';

export type ThemeColors = {
  bg: {
    /** The app ground (page behind the cards). */
    canvas: string;
    /** Cards, lists, sheets. */
    surface: string;
    /** Wells, inputs, hovered rows, segmented-control tracks. */
    sunken: string;
    /** Menus and popovers that float above a surface. */
    raised: string;
    inverse: string;
    /** Scrim behind dialogs and sheets. */
    overlay: string;
    selection: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    /** Not held to a contrast minimum (WCAG exempts inactive controls). */
    disabled: string;
    inverse: string;
    link: string;
  };
  border: {
    subtle: string;
    default: string;
    /** Input outlines and other boundaries that must read at 3:1. */
    strong: string;
    focus: string;
  };
  action: {
    primary: string;
    primaryHover: string;
    primaryPressed: string;
    onPrimary: string;
    secondary: string;
    secondaryHover: string;
    onSecondary: string;
    destructive: string;
    onDestructive: string;
  };
  money: {
    /** Income and positive balances: always paired with a "+" sign. */
    income: string;
    /** Ordinary spending stays in ink: always paired with a "−" sign, never red. */
    expense: string;
    /** Transfers are neutral (ADR-015): muted ink and the ⇄ icon. */
    transfer: string;
    /** Negative balances (credit card) and overspending. */
    debt: string;
    /** Exactly zero. */
    zero: string;
  };
  status: {
    success: string;
    successSurface: string;
    warning: string;
    warningSurface: string;
    danger: string;
    dangerSurface: string;
    info: string;
    infoSurface: string;
  };
  budget: {
    track: string;
    /** Spent, under 85% of the budget. */
    ok: string;
    /** Spent, 85–100% of the budget. */
    near: string;
    /** The part beyond 100%: drawn hatched, labelled "R$ x acima". */
    over: string;
  };
  chart: {
    grid: string;
    axis: string;
    /** The screen's main data element (current month, total balance line). */
    main: string;
    /** Previous period, the part after the cursor, forecast. */
    comparison: string;
    income: string;
    expense: string;
    /** "Outros" when categories are folded. */
    other: string;
    /** Categorical slots, fixed order. Never cycled: the 6th series folds into `other`. */
    series: readonly [string, string, string, string, string];
  };
};

export type Theme = { mode: ThemeMode; colors: ThemeColors };

export const lightTheme: Theme = {
  mode: 'light',
  colors: {
    bg: {
      canvas: concreto[50],
      surface: concreto[0],
      sunken: concreto[100],
      raised: concreto[0],
      inverse: concreto[950],
      overlay: withAlpha(concreto[1000], 0.48),
      selection: cobalto[100],
    },
    text: {
      primary: concreto[950],
      secondary: concreto[700],
      tertiary: concreto[600],
      disabled: concreto[400],
      inverse: concreto[0],
      link: cobalto[600],
    },
    border: {
      subtle: concreto[150],
      default: concreto[200],
      strong: concreto[500],
      focus: cobalto[600],
    },
    action: {
      primary: concreto[950],
      primaryHover: concreto[800],
      primaryPressed: concreto[700],
      onPrimary: concreto[0],
      secondary: concreto[100],
      secondaryHover: concreto[150],
      onSecondary: concreto[950],
      destructive: vermelho[600],
      onDestructive: concreto[0],
    },
    money: {
      income: verde[600],
      expense: concreto[950],
      transfer: concreto[600],
      debt: vermelho[600],
      zero: concreto[600],
    },
    status: {
      success: verde[600],
      successSurface: verde[100],
      warning: ocre[700],
      warningSurface: ocre[100],
      danger: vermelho[600],
      dangerSurface: vermelho[100],
      info: cobalto[600],
      infoSurface: cobalto[50],
    },
    budget: {
      track: concreto[150],
      ok: cobalto[600],
      near: ocre[500],
      over: vermelho[600],
    },
    chart: {
      grid: concreto[100],
      axis: concreto[600],
      main: dataHues.light[0],
      comparison: concreto[600],
      income: verde[600],
      expense: concreto[800],
      other: concreto[800],
      series: dataHues.light,
    },
  },
};

export const darkTheme: Theme = {
  mode: 'dark',
  colors: {
    bg: {
      canvas: concreto[950],
      surface: concreto[900],
      sunken: concreto[1000],
      raised: concreto[850],
      inverse: concreto[50],
      overlay: withAlpha(concreto[1000], 0.64),
      selection: cobalto[900],
    },
    text: {
      primary: concreto[50],
      secondary: concreto[300],
      tertiary: concreto[400],
      disabled: concreto[600],
      inverse: concreto[950],
      link: cobalto[300],
    },
    border: {
      subtle: concreto[850],
      default: concreto[800],
      strong: concreto[500],
      focus: cobalto[300],
    },
    action: {
      primary: concreto[50],
      primaryHover: concreto[200],
      primaryPressed: concreto[300],
      onPrimary: concreto[950],
      secondary: concreto[800],
      secondaryHover: concreto[700],
      onSecondary: concreto[50],
      destructive: vermelho[300],
      onDestructive: concreto[950],
    },
    money: {
      income: verde[300],
      expense: concreto[50],
      transfer: concreto[400],
      debt: vermelho[300],
      zero: concreto[400],
    },
    status: {
      success: verde[300],
      successSurface: verde[900],
      warning: ocre[300],
      warningSurface: ocre[900],
      danger: vermelho[300],
      dangerSurface: vermelho[900],
      info: cobalto[300],
      infoSurface: cobalto[900],
    },
    budget: {
      track: concreto[800],
      ok: cobalto[400],
      near: ocre[300],
      over: vermelho[400],
    },
    chart: {
      grid: concreto[850],
      axis: concreto[400],
      main: dataHues.dark[0],
      comparison: concreto[500],
      income: verde[300],
      expense: concreto[300],
      other: concreto[300],
      series: dataHues.dark,
    },
  },
};

export const themes: Record<ThemeMode, Theme> = { light: lightTheme, dark: darkTheme };
