import type { Category } from '@sobra/shared';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { STACK_FONT_SCALE } from '../../theme/fontScale';
import { makeStyles } from '../../theme/makeStyles';
import { useFontScale, useTheme } from '../../theme/ThemeProvider';
import { AppText } from '../../ui/AppText';
import { CategoryIcon, ColorSquare } from '../../ui/icons';
import { PressableScale } from '../../ui/PressableScale';

type Props = {
  categories: readonly Category[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

const VISIBLE_ROWS = 2;

/** Four columns; three from 1.5× system text and two at 2×, so names stay readable. */
export function gridColumns(fontScale: number): number {
  if (fontScale >= 2) return 2;
  if (fontScale >= STACK_FONT_SCALE) return 3;
  return 4;
}

/**
 * Most used first; two rows visible, the rest a scroll away. Names take two lines and the full
 * name is the tile's accessibility label.
 */
export function CategoryGrid({ categories, selectedId, onSelect }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const columns = gridColumns(useFontScale());
  const [width, setWidth] = useState(0);
  const gap = theme.space[2];
  const tileWidth = width > 0 ? (width - gap * (columns - 1)) / columns : undefined;
  const tileHeight = theme.layout.rowTall + theme.text.caption.lineHeight;
  return (
    <ScrollView
      style={{ maxHeight: tileHeight * VISIBLE_ROWS + gap * (VISIBLE_ROWS - 1) }}
      contentContainerStyle={styles.grid}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      nestedScrollEnabled
      accessibilityRole="radiogroup"
      accessibilityLabel="Categoria"
    >
      {categories.map((category) => {
        const selected = category.id === selectedId;
        return (
          <PressableScale
            key={category.id}
            testID={`category-${category.name}`}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={category.name}
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
              {category.name}
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
