import type { Category } from '@financas/shared';
import { ScrollView, View } from 'react-native';
import { makeStyles } from '../../theme/makeStyles';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from '../../ui/AppText';
import { CategoryIcon, ColorSquare } from '../../ui/icons';
import { PressableScale } from '../../ui/PressableScale';

type Props = {
  categories: readonly Category[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

const COLUMNS = 4;
const VISIBLE_ROWS = 2;

/** Most used first; two rows visible, the rest a scroll away. */
export function CategoryGrid({ categories, selectedId, onSelect }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const tileHeight = theme.layout.rowTall + theme.space[2];
  return (
    <ScrollView
      style={{ maxHeight: tileHeight * VISIBLE_ROWS + theme.space[2] * (VISIBLE_ROWS - 1) }}
      contentContainerStyle={styles.grid}
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
            accessibilityState={{ selected }}
            accessibilityLabel={category.name}
            onPress={() => onSelect(category.id)}
            containerStyle={styles.cell}
            style={[styles.tile, { height: tileHeight }, selected && styles.selected]}
            pressedStyle={styles.pressed}
          >
            <View style={styles.mark}>
              <ColorSquare color={category.color} />
              <CategoryIcon name={category.icon} />
            </View>
            <AppText
              variant="caption"
              numberOfLines={1}
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
  cell: { width: `${100 / COLUMNS - 2}%` },
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.space[1],
    paddingHorizontal: t.space[1],
    borderRadius: t.radii.md,
    borderWidth: 1,
    borderColor: t.colors.border.subtle,
    backgroundColor: t.colors.bg.surface,
  },
  selected: { borderColor: t.colors.border.focus, backgroundColor: t.colors.bg.selection },
  pressed: { backgroundColor: t.colors.bg.sunken },
  mark: { flexDirection: 'row', alignItems: 'center', gap: t.space[1] },
}));
