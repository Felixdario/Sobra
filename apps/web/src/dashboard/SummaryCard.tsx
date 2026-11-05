import type { MonthKey, MonthSummary, SpendingByCategory } from '@sobra/shared';
import { Link } from 'react-router';
import { ErrorLine } from '../components/ErrorLine';
import { Skeleton } from '../components/Skeleton';
import { fitChars } from '../lib/fit';
import { useI18n } from '../i18n/i18nContext';
import type { MonthProgress } from '../lib/month';
import { Delta } from './Delta';
import { KpiStrip } from './KpiStrip';
import { buildRuler, isEmptyMonth } from './model';
import { MonthRuler } from './MonthRuler';
import styles from './SummaryCard.module.css';
import type { DashboardData } from './useDashboardData';

type SummaryCardProps = {
  month: MonthKey;
  progress: MonthProgress;
  summary: DashboardData['summary'];
  spending: DashboardData['spending'];
};

function Status({ progress }: { progress: MonthProgress }) {
  const { t } = useI18n();
  return (
    <span className={styles.status}>
      {progress.partial
        ? t('web.dashboard.summary.partial', { day: progress.day, days: progress.days })
        : t('web.dashboard.summary.closed')}
    </span>
  );
}

function Headline({ summary, progress }: { summary: MonthSummary; progress: MonthProgress }) {
  const { t, rich, fmt } = useI18n();
  const num = (value: number) => <span className="num">{fmt.money(value)}</span>;
  const left = summary.income - summary.expense;
  const previousLeft = summary.previous.income - summary.previous.expense;
  const base = fmt.monthName(summary.previous.month);
  if (progress.partial) {
    return (
      <>
        <p className={styles.caption}>{t('web.dashboard.summary.soFarCaption')}</p>
        <p className={`${styles.figure} num`} style={fitChars(fmt.money(left))}>
          {fmt.money(left)}
        </p>
        <p className={styles.line}>
          {rich('web.dashboard.summary.soFarLine', {
            income: num(summary.income),
            expense: num(summary.expense),
            day: progress.day,
            days: progress.days,
          })}
        </p>
      </>
    );
  }
  const change = left - previousLeft;
  return (
    <>
      <p className={styles.caption}>
        {left >= 0
          ? t('web.dashboard.summary.leftCaption')
          : t('web.dashboard.summary.shortCaption')}
      </p>
      <p
        className={`${styles.figure} ${left < 0 ? styles.debt : ''} num`}
        style={fitChars(fmt.money(left))}
      >
        {fmt.money(left)}
      </p>
      <p className={styles.line}>
        {summary.savingsRate === null
          ? rich(left >= 0 ? 'web.dashboard.summary.leftLine' : 'web.dashboard.summary.shortLine', {
              income: num(summary.income),
            })
          : rich(
              left >= 0
                ? 'web.dashboard.summary.leftLineWithRate'
                : 'web.dashboard.summary.shortLineWithRate',
              {
                income: num(summary.income),
                rate: <strong className="num">{fmt.percent(summary.savingsRate)}</strong>,
              },
            )}
      </p>
      <Delta
        change={change}
        upIsGood
        value={fmt.signedMoney(change)}
        base={t(change >= 0 ? 'web.dashboard.summary.moreThan' : 'web.dashboard.summary.lessThan', {
          month: base,
          amount: fmt.money(previousLeft),
        })}
      />
    </>
  );
}

function Body({
  month,
  progress,
  summary,
  spending,
}: {
  month: MonthKey;
  progress: MonthProgress;
  summary: MonthSummary;
  spending: SpendingByCategory | undefined;
}) {
  const { t, rich, fmt } = useI18n();
  if (isEmptyMonth(summary)) {
    return (
      <>
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>
            {t('web.dashboard.summary.emptyTitle', { month: fmt.monthName(month) })}
          </p>
          <p>
            {rich('web.dashboard.summary.emptyBody', {
              link: <Link to="/transacoes">{t('web.dashboard.summary.emptyLink')}</Link>,
            })}
          </p>
        </div>
        <KpiStrip summary={summary} progress={progress} />
      </>
    );
  }
  return (
    <>
      <div className={styles.headline}>
        <Headline summary={summary} progress={progress} />
      </div>
      {spending ? (
        <MonthRuler
          ruler={buildRuler(summary, spending, t)}
          monthLabel={fmt.monthName(month)}
          partial={progress.partial}
        />
      ) : (
        <Skeleton height="var(--space-8)" />
      )}
      <KpiStrip summary={summary} progress={progress} />
    </>
  );
}

export function SummarySkeleton() {
  return (
    <div className={styles.skeleton} aria-hidden="true">
      <Skeleton width="30%" height="var(--text-caption-line)" />
      <Skeleton width="45%" height="var(--text-figure-xl-line)" />
      <Skeleton width="70%" height="var(--text-body-line)" />
      <Skeleton height="var(--space-8)" className={styles.skeletonRuler ?? ''} />
      <Skeleton height="calc(var(--space-20) + var(--space-4))" />
    </div>
  );
}

export function SummaryCard({ month, progress, summary, spending }: SummaryCardProps) {
  const { t, fmt } = useI18n();
  const stale = summary.isPlaceholderData || spending.isPlaceholderData;
  return (
    <section
      className={styles.card}
      aria-labelledby="resumo-titulo"
      aria-busy={summary.isPending || stale}
    >
      <header className={styles.head}>
        <h2 id="resumo-titulo" className={styles.title}>
          {fmt.monthTitle(month)}
        </h2>
        <Status progress={progress} />
      </header>
      {summary.isError ? (
        <ErrorLine
          what={t('web.dashboard.summary.failed')}
          error={summary.error}
          onRetry={() => void summary.refetch()}
          retrying={summary.isFetching}
        />
      ) : summary.data ? (
        <div className={styles.body} data-stale={stale}>
          <Body month={month} progress={progress} summary={summary.data} spending={spending.data} />
        </div>
      ) : (
        <SummarySkeleton />
      )}
    </section>
  );
}
