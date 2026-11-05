import type { MonthSummary } from '@sobra/shared';
import { useI18n } from '../i18n/i18nContext';
import { fitChars } from '../lib/fit';
import type { MonthProgress } from '../lib/month';
import { Delta } from './Delta';
import styles from './KpiStrip.module.css';
import { savingsHeadline } from './model';

type KpiStripProps = { summary: MonthSummary; progress: MonthProgress };

function SavingsCell({ summary, progress, base }: KpiStripProps & { base: string }) {
  const { t, fmt } = useI18n();
  const headline = savingsHeadline(summary, progress);
  return (
    <div className={styles.cell}>
      <dt className={styles.label}>{t('web.dashboard.kpi.savingsRate')}</dt>
      {headline.kind === 'rate' ? (
        <>
          <dd className={`${styles.value} num`}>{fmt.percent(headline.rate)}</dd>
          {headline.previous === null ? null : (
            <dd>
              <Delta
                size="small"
                change={headline.rate - headline.previous}
                upIsGood
                value={fmt.percentagePoints(headline.rate - headline.previous)}
                base={t('web.dashboard.kpi.vs', { month: base })}
              />
            </dd>
          )}
        </>
      ) : headline.kind === 'partial' ? (
        <>
          <dd className={styles.pending}>{t('web.dashboard.kpi.open')}</dd>
          <dd className={styles.note}>
            {t('web.dashboard.kpi.openNote', { day: headline.day, days: headline.days })}
          </dd>
        </>
      ) : (
        <>
          <dd className={styles.pending}>{t('common.labels.none')}</dd>
          <dd className={styles.note}>{t('web.dashboard.kpi.noIncome')}</dd>
        </>
      )}
    </div>
  );
}

type MoneyCellProps = {
  label: string;
  value: number;
  change: number;
  upIsGood: boolean;
  base: string;
  debt?: boolean;
  note?: string | null;
};

function MoneyCell({ label, value, change, upIsGood, base, debt = false, note }: MoneyCellProps) {
  const { t, fmt } = useI18n();
  return (
    <div className={styles.cell}>
      <dt className={styles.label}>{label}</dt>
      <dd
        className={`${styles.value} ${debt && value < 0 ? styles.debt : value === 0 ? styles.zero : ''} num`}
        style={fitChars(fmt.money(value))}
      >
        {fmt.money(value)}
      </dd>
      <dd>
        {note ? (
          <span className={styles.note}>{note}</span>
        ) : (
          <Delta
            size="small"
            change={change}
            upIsGood={upIsGood}
            value={fmt.signedMoney(change)}
            base={t('web.dashboard.kpi.vs', { month: base })}
          />
        )}
      </dd>
    </div>
  );
}

/**
 * Four figures in one strip (not four identical cards). In a partial month the income and
 * expense changes are not compared with a whole month: the cell says how far the month is.
 */
export function KpiStrip({ summary, progress }: KpiStripProps) {
  const { t, fmt } = useI18n();
  const base = fmt.monthName(summary.previous.month);
  const partialNote = progress.partial
    ? t('web.dashboard.kpi.untilDay', { day: progress.day })
    : null;
  return (
    <dl className={styles.strip}>
      <MoneyCell
        label={t('web.dashboard.kpi.balance')}
        value={summary.balance}
        change={summary.delta.balance.absolute}
        upIsGood
        base={base}
        debt
      />
      <MoneyCell
        label={t('web.dashboard.kpi.income')}
        value={summary.income}
        change={summary.delta.income.absolute}
        upIsGood
        base={base}
        note={partialNote}
      />
      <MoneyCell
        label={t('web.dashboard.kpi.expense')}
        value={summary.expense}
        change={summary.delta.expense.absolute}
        upIsGood={false}
        base={base}
        note={partialNote}
      />
      <SavingsCell summary={summary} progress={progress} base={base} />
    </dl>
  );
}
