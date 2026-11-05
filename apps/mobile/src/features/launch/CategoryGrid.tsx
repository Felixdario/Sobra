import type { Category } from '@sobra/shared';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useI18n } from '../../i18n/I18nProvider';
import { STACK_FONT_SCALE } from '../../theme/fontScale';
import { makeStyles } from '../../theme/makeStyles';
import { useTheme, useThemeContext } from '../../theme/ThemeProvider';
import { AppText } from '../../ui/AppText';
import { CategoryIcon, ColorSquare } from '../../ui/icons';
import { PressableScale } from '../../ui/PressableScale';

type Props = {
  categories: readonly Category[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

const VISIBLE_ROWS = 2;

/**
 * Average advance of an Archivo letter in em, measured on the caption ("Restaurantes", 12
 * letters, is about 72pt wide at 13pt).
 */
const LETTER_EM = 0.47;

type Fit = { width: number; gap: number; padding: number; fontSize: number; longestWord: number };

/**
 * Four columns; three from 1.5× system text and two at 2×, so names stay readable. With the
 * grid's width known, a column goes away while the longest word of a name would not fit a tile
 * ("Subscriptions", "Entertainment" in English): a word is never broken in the middle.
 */
export function gridColumns(fontScale: number, fit?: Fit): number {
  let columns = fontScale >= 2 ? 2 : fontScale >= STACK_FONT_SCALE ? 3 : 4;
  if (!fit || fit.width <= 0) return columns;
  const needed = fit.longestWord * LETTER_EM * fit.fontSize;
  const inner = (count: number) => (fit.width - fit.gap * (count - 1)) / count - fit.padding;
  while (columns > 2 && inner(columns) < needed) columns -= 1;
  return columns;
}

const longestWord = (names: readonly string[]) =>
  Math.max(0, ...names.flatMap((name) => name.split(/\s+/).map((word) => [...word].length)));

/**
 * Most used first; two rows visible, the rest a scroll away. Names take two lines and the full
 * name is the tile's accessibility label.
 */
export function CategoryGrid({ categories, selectedId, onSelect }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const i18n = useI18n();
  const { fontScale, simulatedScale } = useThemeContext();
  const [width, setWidth] = useState(0);
  const gap = theme.space[2];
  const names = categories.map((category) => i18n.category(category));
  const columns = gridColumns(fontScale, {
    width,
    gap,
    // Tile padding on both sides plus its 1px borders.
    padding: theme.space[1] * 2 + 2,
    // The web simulation already scaled the theme; natively the system scales the text.
    fontSize: theme.text.caption.fontSize * (simulatedScale ? 1 : fontScale),
    longestWord: longestWord(names),
  });
  const tileWidth = width > 0 ? (width - gap * (columns - 1)) / columns : undefined;
  const tileHeight = theme.layout.rowTall + theme.text.caption.lineHeight;
  return (
    <ScrollView
      style={{ maxHeight: tileHeight * VISIBLE_ROWS + gap * (VISIBLE_ROWS - 1) }}
      contentContainerStyle={styles.grid}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      nestedScrollEnabled
      accessibilityRole="radiogroup"
      accessibilityLabel={i18n.t('mobile.launch.category')}
    >
      {categories.map((category) => {
        const selected = category.id === selectedId;
        const name = i18n.category(category);
        return (
          <PressableScale
            key={category.id}
            testID={`category-${name}`}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={name}
            onPress={() => onSelect(category.id)}
            containerStyle={{ width: tileWidth ?? `${100 / columns - 3}%` }}
            style={[styles.tile, { minHeight: tileHeight }, selected && styles.selected]}
            pressedStyle={styles.pressed}
          >
            <View style={styles.mark}>
              <ColorSquare color={category.color} />
              <CategoryIcon name={category.icon} />
            </View>
            <AppText
              variant="caption"
              numberOfLines={2}
              style={styles.name}
              color={selected ? theme.colors.text.link : theme.colors.text.primary}
            >
              {name}
            </AppText>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

const useStyles = makeStyles((t) => ({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] },
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.space[1],
    paddingHorizontal: t.space[1],
    paddingVertical: t.space[1],
    borderRadius: t.radii.md,
    borderWidth: 1,
    borderColor: t.colors.border.subtle,
    backgroundColor: t.colors.bg.surface,
  },
  selected: { borderColor: t.colors.border.focus, backgroundColor: t.colors.bg.selection },
  pressed: { backgroundColor: t.colors.bg.sunken },
  mark: { flexDirection: 'row', alignItems: 'center', gap: t.space[1] },
  name: { textAlign: 'center' },
}));
