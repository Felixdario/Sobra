import { lastNMonths, type Account, type Category, type MonthKey } from '@sobra/shared';
import { View } from 'react-native';
import { useI18n } from '../../i18n/I18nProvider';
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
  const i18n = useI18n();
  const { t, monthTitle } = i18n;
  const months = lastNMonths(MONTHS_BACK).reverse();
  const sortedCategories = categories
    .map((category) => ({ ...category, label: i18n.category(category) }))
    .sort((a, b) => i18n.compare(a.label, b.label));
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      label={t('mobile.transactions.filters')}
      header={
        <AppText variant="titleSm" accessibilityRole="header" style={styles.title}>
          {t('mobile.transactions.filters')}
        </AppText>
      }
      footer={
        <View style={styles.footer}>
          <Button
            variant="secondary"
            label={t('common.actions.clearFilters')}
            disabled={!hasFilters(filters)}
            onPress={() => onChange({ search: filters.search })}
            containerStyle={styles.flex}
          />
          <Button
            testID="filters-done"
            label={t('mobile.transactions.filter.done')}
            onPress={onClose}
            containerStyle={styles.flex}
          />
        </View>
      }
    >
      <View style={styles.content}>
        <Group label={t('mobile.transactions.filter.month')}>
          <Chip
            accessibilityRole="radio"
            label={t('mobile.transactions.filter.allMonths')}
            selected={!filters.month}
            onPress={() => onChange({ ...filters, month: undefined })}
          />
          {months.map((month: MonthKey) => (
            <Chip
              accessibilityRole="radio"
              key={month}
              testID={`filter-month-${month}`}
              label={monthTitle(month)}
              selected={filters.month === month}
              onPress={() => onChange({ ...filters, month })}
            />
          ))}
        </Group>
        <Group label={t('mobile.transactions.filter.account')}>
          <Chip
            accessibilityRole="radio"
            label={t('mobile.transactions.filter.all')}
            selected={!filters.accountId}
            onPress={() => onChange({ ...filters, accountId: undefined })}
          />
          {accounts.map((account) => (
            <Chip
              accessibilityRole="radio"
              key={account.id}
              testID={`filter-account-${account.name}`}
              label={account.name}
              selected={filters.accountId === account.id}
              onPress={() => onChange({ ...filters, accountId: account.id })}
            />
          ))}
        </Group>
        <Group label={t('mobile.transactions.filter.category')}>
          <Chip
            accessibilityRole="radio"
            label={t('mobile.transactions.filter.all')}
            selected={!filters.categoryId}
            onPress={() => onChange({ ...filters, categoryId: undefined })}
          />
          {sortedCategories.map((category) => (
            <Chip
              accessibilityRole="radio"
              key={category.id}
              testID={`filter-category-${category.label}`}
              label={category.label}
              selected={filters.categoryId === category.id}
              onPress={() => onChange({ ...filters, categoryId: category.id })}
            />
          ))}
        </Group>
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
  content: { gap: t.space[4], paddingBottom: t.space[4] },
  group: { gap: t.space[2] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] },
  footer: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] },
  flex: { flexGrow: 1, flexBasis: '40%' },
}));
