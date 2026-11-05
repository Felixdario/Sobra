import { Delete } from 'lucide-react-native';
import { View } from 'react-native';
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
    <View style={styles.grid} accessibilityLabel="Teclado do valor">
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
  const isBackspace = value === 'backspace';
  return (
    <PressableScale
      testID={`key-${value}`}
      accessibilityRole="button"
      accessibilityLabel={isBackspace ? 'Apagar último dígito' : value}
      accessibilityHint={isBackspace ? 'Toque e segure para zerar' : undefined}
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
        <AppText variant="title" style={styles.digit}>
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
    height: t.layout.rowTall,
    borderRadius: t.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.bg.sunken,
  },
  keyPressed: { backgroundColor: t.colors.action.secondaryHover },
  digit: { fontVariant: ['tabular-nums', 'lining-nums'] },
}));
