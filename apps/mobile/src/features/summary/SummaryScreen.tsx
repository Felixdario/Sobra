import { isApiError } from '@financas/client';
import { nextMonth, previousMonth, TIME_ZONE, toMonthKey, type MonthKey } from '@financas/shared';
import { useQuery } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { useIsOnline } from '../../api/network';
import { useServices } from '../../api/ServicesProvider';
import { haptics } from '../../lib/haptics';
import { monthName, monthProgress } from '../../lib/month';
import { makeStyles } from '../../theme/makeStyles';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from '../../ui/AppText';
import { Button } from '../../ui/Button';
import { EmptyState, ErrorLine, OfflineBanner, Skeleton } from '../../ui/states';
import { useLaunch } from '../launch/LaunchSheetProvider';
import { BudgetList } from './BudgetList';
import { HeadlineCard } from './HeadlineCard';
import { MonthRuler } from './MonthRuler';
import { MonthSwitcher } from './MonthSwitcher';
import { buildHeadline, buildRuler, emptyMonthText } from './summaryModel';

const time = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: TIME_ZONE,
});

/** Horizontal swipe that changes month: needs clear horizontal intent so vertical scroll wins. */
const SWIPE_ACTIVATE = 24;
const SWIPE_FAIL = 12;
const SWIPE_VELOCITY = 500;

export function SummaryScreen({ initialMonth }: { initialMonth?: MonthKey }) {
  const latest = toMonthKey(new Date());
  const [month, setMonth] = useState<MonthKey>(initialMonth ?? latest);
  const { queries } = useServices();
  const theme = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const online = useIsOnline();
  const launch = useLaunch();

  const summary = useQuery(queries.summary.month({ month }));
  const spending = useQuery(queries.summary.spendingByCategory({ month }));
  const budgets = useQuery(queries.summary.budgetVsActual(month));
  const progress = monthProgress(month);

  const changeMonth = (next: MonthKey) => {
    if (next > latest || next === month) return;
    haptics.selection();
    setMonth(next);
  };

  const swipe = usePanGesture({
    activeOffsetX: [-SWIPE_ACTIVATE, SWIPE_ACTIVATE],
    failOffsetY: [-SWIPE_FAIL, SWIPE_FAIL],
    onDeactivate: (event) => {
      const forward = event.translationX < 0 || event.velocityX < -SWIPE_VELOCITY;
      scheduleOnRN(swipeTo, forward ? 1 : -1);
    },
  });
  function swipeTo(direction: 1 | -1) {
    changeMonth(direction === 1 ? nextMonth(month) : previousMonth(month));
  }

  const refreshing = summary.isRefetching || spending.isRefetching || budgets.isRefetching;
  const refresh = () => {
    summary.refetch();
    spending.refetch();
    budgets.refetch();
  };
  const offline = !online || (isApiError(summary.error) && summary.error.code === 'NETWORK_ERROR');
  const isEmpty = summary.data && summary.data.income === 0 && summary.data.expense === 0;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {offline && summary.data ? (
        <OfflineBanner
          message={`Sem conexão — mostrando os dados de ${time.format(summary.dataUpdatedAt)}`}
        />
      ) : null}
      <GestureDetector gesture={swipe}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={theme.colors.text.secondary}
              colors={[theme.colors.text.primary]}
            />
          }
        >
          <MonthSwitcher month={month} latest={latest} onChange={changeMonth} />

          {summary.isPending && !summary.isError ? <SummarySkeleton /> : null}
          {summary.isError && !summary.data ? (
            <ErrorLine
              message={`${offline ? 'Sem conexão. ' : ''}Não deu para carregar o resumo de ${monthName(month)}.`}
              onRetry={refresh}
            />
          ) : null}

          {summary.data && isEmpty ? (
            <Section>
              <EmptyState
                message={emptyMonthText(month)}
                action={<Button label="Lançar gasto" onPress={() => launch.open()} />}
              />
            </Section>
          ) : null}

          {summary.data && !isEmpty ? (
            <>
              <HeadlineCard
                headline={buildHeadline(summary.data, progress)}
                summary={summary.data}
              />
              <Section title="Para onde foi">
                {spending.data ? (
                  <MonthRuler
                    ruler={buildRuler(summary.data.income, spending.data.items)}
                    partial={progress.kind !== 'closed'}
                  />
                ) : spending.isError ? (
                  <ErrorLine
                    message="Não deu para carregar os gastos por categoria."
                    onRetry={() => spending.refetch()}
                  />
                ) : (
                  <Skeleton height={theme.space[6]} />
                )}
              </Section>
            </>
          ) : null}

          {summary.data ? (
            <Section title="Orçamentos">
              {budgets.data ? (
                budgets.data.items.length > 0 ? (
                  <BudgetList items={budgets.data.items} />
                ) : (
                  <EmptyState
                    message={`Sem orçamentos em ${monthName(month)}. Defina orçamentos no painel web.`}
                  />
                )
              ) : budgets.isError ? (
                <ErrorLine
                  message="Não deu para carregar os orçamentos."
                  onRetry={() => budgets.refetch()}
                />
              ) : (
                <BudgetSkeleton />
              )}
            </Section>
          ) : null}
        </ScrollView>
      </GestureDetector>
    </View>
  );
}

function Section({ title, children }: { title?: string; children: ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.card}>
      {title ? (
        <AppText variant="titleSm" accessibilityRole="header">
          {title}
        </AppText>
      ) : null}
      {children}
    </View>
  );
}

function SummarySkeleton() {
  const theme = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.skeleton} accessibilityLabel="Carregando o resumo">
      <View style={styles.card}>
        <Skeleton height={theme.text.label.lineHeight} width="30%" />
        <Skeleton height={theme.text.figureXl.lineHeight} width="70%" />
        <Skeleton height={theme.text.bodySm.lineHeight} />
        {[0, 1, 2].map((row) => (
          <Skeleton key={row} height={theme.layout.row - theme.space[2]} />
        ))}
      </View>
      <View style={styles.card}>
        <Skeleton height={theme.space[6]} />
      </View>
      <View style={styles.card}>
        <BudgetSkeleton />
      </View>
    </View>
  );
}

function BudgetSkeleton() {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.space[4] }}>
      {[0, 1, 2].map((row) => (
        <Skeleton key={row} height={theme.layout.rowTall} />
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.bg.canvas },
  content: { padding: t.layout.phoneMargin, gap: t.space[4] },
  card: {
    gap: t.space[3],
    padding: t.space[4],
    borderRadius: t.radii.lg,
    backgroundColor: t.colors.bg.surface,
  },
  skeleton: { gap: t.space[4] },
}));
