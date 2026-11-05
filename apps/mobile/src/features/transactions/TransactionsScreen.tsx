import { isApiError } from '@sobra/client';
import { isOptimisticId } from '@sobra/client/query';
import type { Transaction } from '@sobra/shared';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Search, SlidersHorizontal, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { durations, easings } from '@sobra/tokens';
import { RefreshControl, TextInput, View } from 'react-native';
import Animated, { Easing, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsOnline } from '../../api/network';
import { useServices } from '../../api/ServicesProvider';
import { useI18n } from '../../i18n/I18nProvider';
import { useDebounced } from '../../lib/useDebounced';
import { makeStyles } from '../../theme/makeStyles';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from '../../ui/AppText';
import { Button } from '../../ui/Button';
import { Chip } from '../../ui/Chip';
import { ICON_SIZE, ICON_STROKE } from '../../ui/icons';
import { PressableScale } from '../../ui/PressableScale';
import { EmptyState, ErrorLine, OfflineBanner, Skeleton } from '../../ui/states';
import { useLaunch } from '../launch/LaunchSheetProvider';
import { DayHeader } from './DayHeader';
import { FilterSheet } from './FilterSheet';
import { groupByDay, hasFilters, toParams, type Filters, type ListRow } from './listModel';
import { RowMenu } from './RowMenu';
import { SwipeableRow, SwipeProvider, useSwipeCoordinator } from './SwipeableRow';
import { describeTransaction, TransactionRow } from './TransactionRow';
import { useRowActions } from './useRowActions';

const SEARCH_DEBOUNCE_MS = 300;

/**
 * When a row leaves (swipe to delete) the rows below close the gap in 180ms instead of jumping.
 * Transform-based, on the UI thread; Reanimated skips it with Reduce Motion on.
 */
const REFLOW = LinearTransition.duration(durations.base).easing(Easing.bezier(...easings.standard));

export function TransactionsScreen() {
  return (
    <SwipeProvider>
      <TransactionsList />
    </SwipeProvider>
  );
}

function TransactionsList() {
  const { queries } = useServices();
  const theme = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const online = useIsOnline();
  const launch = useLaunch();
  const swipe = useSwipeCoordinator();
  const actions = useRowActions();
  const i18n = useI18n();
  const { t } = i18n;

  const [filters, setFilters] = useState<Filters>({});
  const [searchText, setSearchText] = useState('');
  const search = useDebounced(searchText, SEARCH_DEBOUNCE_MS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [menu, setMenu] = useState<{ open: boolean; tx: Transaction | null }>({
    open: false,
    tx: null,
  });

  const effective = useMemo(() => ({ ...filters, search }), [filters, search]);
  const params = useMemo(() => toParams(effective), [effective]);
  const list = useInfiniteQuery(queries.transactions.infinite(params));
  const accounts = useQuery(queries.accounts.list());
  const categories = useQuery(queries.categories.list());

  const items = useMemo(() => list.data?.pages.flatMap((page) => page.items) ?? [], [list.data]);
  const rows = useMemo(() => groupByDay(items, i18n), [items, i18n]);
  const filtered = hasFilters(effective);
  const offline = !online || (isApiError(list.error) && list.error.code === 'NETWORK_ERROR');

  const clearAll = () => {
    setFilters({});
    setSearchText('');
  };

  const renderItem = ({ item }: { item: ListRow }) => {
    if (item.kind === 'day') return <DayHeader label={item.label} total={item.total} />;
    const tx = item.tx;
    return (
      <SwipeableRow
        id={tx.id}
        label={describeTransaction(tx, i18n)}
        disabled={isOptimisticId(tx.id)}
        onEdit={() => actions.edit(tx)}
        onDelete={() => actions.remove(tx)}
        onLongPress={() => setMenu({ open: true, tx })}
      >
        <TransactionRow tx={tx} />
      </SwipeableRow>
    );
  };

  const accountName = accounts.data?.find((account) => account.id === filters.accountId)?.name;
  const filterCategory = categories.data?.find((category) => category.id === filters.categoryId);
  const categoryName = filterCategory ? i18n.category(filterCategory) : undefined;
  const activeCount = [filters.month, filters.accountId, filters.categoryId].filter(Boolean).length;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {offline && list.data ? (
        <OfflineBanner
          message={t('mobile.states.offlineSince', { time: i18n.time(list.dataUpdatedAt) })}
        />
      ) : null}
      <View style={styles.header}>
        <AppText variant="title" accessibilityRole="header">
          {t('nav.transactions')}
        </AppText>
        <View style={styles.searchRow}>
          <View style={styles.search}>
            <Search
              size={ICON_SIZE.inline}
              color={theme.colors.text.tertiary}
              strokeWidth={ICON_STROKE}
            />
            <TextInput
              testID="search"
              value={searchText}
              onChangeText={setSearchText}
              placeholder={t('mobile.transactions.searchPlaceholder')}
              placeholderTextColor={theme.colors.text.tertiary}
              accessibilityLabel={t('mobile.transactions.searchA11y')}
              returnKeyType="search"
              autoCorrect={false}
              style={styles.searchInput}
            />
          </View>
          <PressableScale
            testID="open-filters"
            accessibilityRole="button"
            accessibilityLabel={
              activeCount > 0
                ? t('mobile.transactions.filtersActive', { count: activeCount })
                : t('mobile.transactions.filters')
            }
            onPress={() => setFiltersOpen(true)}
            style={[styles.filterButton, activeCount > 0 && styles.filterActive]}
            pressedStyle={styles.filterPressed}
          >
            <SlidersHorizontal
              size={ICON_SIZE.row}
              color={activeCount > 0 ? theme.colors.text.link : theme.colors.text.primary}
              strokeWidth={ICON_STROKE}
            />
          </PressableScale>
        </View>
        {activeCount > 0 ? (
          <View style={styles.activeChips}>
            {filters.month ? (
              <RemovableChip
                label={i18n.monthTitle(filters.month)}
                onRemove={() => setFilters({ ...filters, month: undefined })}
              />
            ) : null}
            {filters.accountId ? (
              <RemovableChip
                label={accountName ?? t('mobile.transactions.filter.account')}
                onRemove={() => setFilters({ ...filters, accountId: undefined })}
              />
            ) : null}
            {filters.categoryId ? (
              <RemovableChip
                label={categoryName ?? t('mobile.transactions.filter.category')}
                onRemove={() => setFilters({ ...filters, categoryId: undefined })}
              />
            ) : null}
            <Button variant="ghost" label={t('mobile.transactions.clear')} onPress={clearAll} />
          </View>
        ) : null}
      </View>

      {list.isPending && !list.isError ? <ListSkeleton /> : null}
      {list.isError && !list.data ? (
        <View style={styles.padded}>
          <ErrorLine
            message={
              offline
                ? t('mobile.states.offlinePrefix', {
                    message: t('mobile.transactions.loadError'),
                  })
                : t('mobile.transactions.loadError')
            }
            onRetry={() => {
              list.refetch();
            }}
          />
        </View>
      ) : null}
      {list.data ? (
        <Animated.FlatList
          testID="transactions-list"
          itemLayoutAnimation={REFLOW}
          data={rows}
          keyExtractor={(row) => row.key}
          renderItem={renderItem}
          onScrollBeginDrag={swipe.closeAll}
          onEndReached={() => {
            if (list.hasNextPage && !list.isFetchingNextPage) list.fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          initialNumToRender={14}
          maxToRenderPerBatch={14}
          windowSize={9}
          removeClippedSubviews
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            <RefreshControl
              refreshing={list.isRefetching && !list.isFetchingNextPage}
              onRefresh={() => {
                list.refetch();
              }}
              tintColor={theme.colors.text.secondary}
            />
          }
          ListFooterComponent={list.isFetchingNextPage ? <ListSkeleton rows={2} /> : undefined}
          ListEmptyComponent={
            <View style={styles.padded}>
              {filtered ? (
                <EmptyState
                  message={t('common.states.emptyFiltered')}
                  action={
                    <Button
                      variant="secondary"
                      label={t('common.actions.clearFilters')}
                      onPress={clearAll}
                    />
                  }
                />
              ) : (
                <EmptyState
                  message={t('mobile.transactions.empty')}
                  action={
                    <Button
                      label={t('mobile.launch.title.expense')}
                      onPress={() => launch.open()}
                    />
                  }
                />
              )}
            </View>
          }
        />
      ) : null}

      <FilterSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={filters}
        onChange={setFilters}
        accounts={(accounts.data ?? []).filter((account) => !account.archived)}
        categories={categories.data ?? []}
      />
      <RowMenu
        open={menu.open}
        tx={menu.tx}
        onClose={() => setMenu((current) => ({ ...current, open: false }))}
        onEdit={actions.edit}
        onDelete={actions.remove}
      />
    </View>
  );
}

function RemovableChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  const theme = useTheme();
  const { t } = useI18n();
  return (
    <Chip
      label={label}
      selected
      accessibilityLabel={t('mobile.transactions.removeFilter', { label })}
      onPress={onRemove}
      icon={<X size={ICON_SIZE.inline} color={theme.colors.text.link} strokeWidth={ICON_STROKE} />}
    />
  );
}

function ListSkeleton({ rows = 6 }: { rows?: number }) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  return (
    <View style={styles.padded} accessibilityLabel={t('mobile.transactions.loading')}>
      <Skeleton height={theme.layout.rowCompact} width="40%" />
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} height={theme.layout.rowTall} />
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.bg.canvas },
  header: {
    paddingHorizontal: t.layout.phoneMargin,
    paddingTop: t.space[3],
    paddingBottom: t.space[2],
    gap: t.space[3],
  },
  searchRow: { flexDirection: 'row', gap: t.space[2], alignItems: 'center' },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[2],
    minHeight: t.layout.controlHeightTouch,
    paddingHorizontal: t.space[3],
    borderRadius: t.radii.md,
    borderWidth: 1,
    borderColor: t.colors.border.strong,
    backgroundColor: t.colors.bg.surface,
  },
  searchInput: {
    ...t.text.body,
    flex: 1,
    color: t.colors.text.primary,
    minHeight: t.layout.controlHeightTouch - 2,
  },
  filterButton: {
    width: t.touchTarget.ios,
    height: t.touchTarget.ios,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: t.radii.md,
    backgroundColor: t.colors.bg.sunken,
  },
  filterActive: { backgroundColor: t.colors.bg.selection },
  filterPressed: { backgroundColor: t.colors.action.secondaryHover },
  activeChips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: t.space[2] },
  padded: { padding: t.layout.phoneMargin, gap: t.space[2] },
}));
