import { isApiError } from '@financas/client';
import { nextMonth, previousMonth, TIME_ZONE, toMonthKey, type MonthKey } from '@financas/shared';
import { useQuery } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { RefreshControl, ScrollView, useWindowDimensions, View } from 'react-native';
import { durations, easings, springs } from '@financas/tokens';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { useIsOnline } from '../../api/network';
import { useServices } from '../../api/ServicesProvider';
import { project, rubberband } from '../../lib/gesture';
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
/** Projected travel (release point + momentum) that commits the change; shorter springs back. */
const SWIPE_COMMIT = 64;

/**
 * Changing month swaps every number on the screen; a 180ms fade marks the swap so it doesn't
 * read as a glitch (same as the web). Opacity only, so it stays with Reduce Motion on.
 */
const MONTH_FADE = FadeIn.duration(durations.base).easing(Easing.bezier(...easings.standard));

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
  const reduced = useReducedMotion();
  const { width: screenWidth } = useWindowDimensions();
  const dragX = useSharedValue(0);

  const changeMonth = (next: MonthKey) => {
    if (next > latest || next === month) return;
    haptics.selection();
    setMonth(next);
  };

  // The month follows the finger with rising resistance (it hints where it's going), then
  // springs home with the finger's velocity; the month changes if the projected travel commits.
  const swipe = usePanGesture({
    activeOffsetX: [-SWIPE_ACTIVATE, SWIPE_ACTIVATE],
    failOffsetY: [-SWIPE_FAIL, SWIPE_FAIL],
    onUpdate: (event) => {
      if (!reduced) dragX.set(rubberband(event.translationX, screenWidth));
    },
    onDeactivate: (event) => {
      const projected = event.translationX + project(event.velocityX);
      dragX.set(reduced ? 0 : withSpring(0, { ...springs.swipe, velocity: event.velocityX }));
      if (Math.abs(projected) >= SWIPE_COMMIT) scheduleOnRN(swipeTo, projected < 0 ? 1 : -1);
    },
  });
  const dragStyle = useAnimatedStyle(() => ({ transform: [{ translateX: dragX.get() }] }));
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
          <Animated.View style={dragStyle}>
            <Animated.View key={month} entering={MONTH_FADE} style={styles.month}>
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
            </Animated.View>
          </Animated.View>
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
  month: { gap: t.space[4] },
}));
