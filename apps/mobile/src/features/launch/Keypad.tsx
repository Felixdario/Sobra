import { Delete } from 'lucide-react-native';
import { View } from 'react-native';
import { useI18n } from '../../i18n/I18nProvider';
import { CONTROL_MAX_FONT_SCALE } from '../../theme/fontScale';
import { makeStyles } from '../../theme/makeStyles';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from '../../ui/AppText';
import { ICON_STROKE } from '../../ui/icons';
import { PressableScale } from '../../ui/PressableScale';
import type { KeypadKey } from './centsKeypad';

const ROWS: readonly (readonly KeypadKey[])[] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['00', '0', 'backspace'],
];

export function Keypad({ onKey }: { onKey: (key: KeypadKey) => void }) {
  const styles = useStyles();
  return (
    <View style={styles.grid}>
      {ROWS.map((row) => (
        <View key={row.join()} style={styles.row}>
          {row.map((key) => (
            <Key key={key} value={key} onKey={onKey} />
          ))}
        </View>
      ))}
    </View>
  );
}

function Key({ value, onKey }: { value: KeypadKey; onKey: (key: KeypadKey) => void }) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const isBackspace = value === 'backspace';
  return (
    <PressableScale
      testID={`key-${value}`}
      accessibilityRole="button"
      accessibilityLabel={
        isBackspace
          ? t('mobile.launch.keypad.backspace')
          : value === '00'
            ? t('mobile.launch.keypad.doubleZero')
            : value
      }
      accessibilityHint={isBackspace ? t('mobile.launch.keypad.backspaceHint') : undefined}
      onPress={() => onKey(value)}
      onLongPress={isBackspace ? () => onKey('clear') : undefined}
      containerStyle={styles.keyArea}
      style={styles.key}
      pressedStyle={styles.keyPressed}
    >
      {isBackspace ? (
        <Delete
          size={theme.text.title.fontSize}
          color={theme.colors.text.primary}
          strokeWidth={ICON_STROKE}
        />
      ) : (
        <AppText
          variant="title"
          style={styles.digit}
          maxFontSizeMultiplier={CONTROL_MAX_FONT_SCALE}
        >
          {value}
        </AppText>
      )}
    </PressableScale>
  );
}

const useStyles = makeStyles((t) => ({
  grid: { gap: t.space[2] },
  row: { flexDirection: 'row', gap: t.space[2] },
  keyArea: { flex: 1 },
  key: {
    minHeight: t.layout.rowTall,
    borderRadius: t.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.bg.sunken,
  },
  keyPressed: { backgroundColor: t.colors.action.secondaryHover },
  digit: { fontVariant: ['tabular-nums', 'lining-nums'] },
}));
