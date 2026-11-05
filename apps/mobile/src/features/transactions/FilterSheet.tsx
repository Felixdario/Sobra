import { lastNMonths, type Account, type Category, type MonthKey } from '@financas/shared';
import { ScrollView, View } from 'react-native';
import { monthTitle } from '../../lib/month';
import { makeStyles } from '../../theme/makeStyles';
import { AppText } from '../../ui/AppText';
import { BottomSheet } from '../../ui/BottomSheet';
import { Button } from '../../ui/Button';
import { Chip } from '../../ui/Chip';
import { hasFilters, type Filters } from './listModel';

const MONTHS_BACK = 6;

type Props = {
  open: boolean;
  onClose: () => void;
  filters: Filters;
  onChange: (filters: Filters) => void;
  accounts: readonly Account[];
  categories: readonly Category[];
};

/** Month, account and category. Each chip applies at once; the list behind updates live. */
export function FilterSheet({ open, onClose, filters, onChange, accounts, categories }: Props) {
  const styles = useStyles();
  const months = lastNMonths(MONTHS_BACK).reverse();
  const sortedCategories = [...categories].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      label="Filtros"
      header={
        <AppText variant="titleSm" accessibilityRole="header" style={styles.title}>
          Filtros
        </AppText>
      }
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Group label="Mês">
          <Chip
            label="Todos"
            selected={!filters.month}
            onPress={() => onChange({ ...filters, month: undefined })}
          />
          {months.map((month: MonthKey) => (
            <Chip
              key={month}
              testID={`filter-month-${month}`}
              label={monthTitle(month)}
              selected={filters.month === month}
              onPress={() => onChange({ ...filters, month })}
            />
          ))}
        </Group>
        <Group label="Conta">
          <Chip
            label="Todas"
            selected={!filters.accountId}
            onPress={() => onChange({ ...filters, accountId: undefined })}
          />
          {accounts.map((account) => (
            <Chip
              key={account.id}
              testID={`filter-account-${account.name}`}
              label={account.name}
              selected={filters.accountId === account.id}
              onPress={() => onChange({ ...filters, accountId: account.id })}
            />
          ))}
        </Group>
        <Group label="Categoria">
          <Chip
            label="Todas"
            selected={!filters.categoryId}
            onPress={() => onChange({ ...filters, categoryId: undefined })}
          />
          {sortedCategories.map((category) => (
            <Chip
              key={category.id}
              testID={`filter-category-${category.name}`}
              label={category.name}
              selected={filters.categoryId === category.id}
              onPress={() => onChange({ ...filters, categoryId: category.id })}
            />
          ))}
        </Group>
      </ScrollView>
      <View style={styles.footer}>
        <Button
          variant="secondary"
          label="Limpar filtros"
          disabled={!hasFilters(filters)}
          onPress={() => onChange({ search: filters.search })}
          containerStyle={styles.flex}
        />
        <Button
          testID="filters-done"
          label="Ver transações"
          onPress={onClose}
          containerStyle={styles.flex}
        />
      </View>
    </BottomSheet>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.group} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <AppText variant="label" tone="secondary">
        {label}
      </AppText>
      <View style={styles.chips}>{children}</View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  title: { paddingBottom: t.space[2] },
  scroll: { maxHeight: t.layout.rowTall * 8 },
  content: { gap: t.space[4], paddingBottom: t.space[4] },
  group: { gap: t.space[2] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] },
  footer: { flexDirection: 'row', gap: t.space[2], paddingTop: t.space[2] },
  flex: { flex: 1 },
}));
