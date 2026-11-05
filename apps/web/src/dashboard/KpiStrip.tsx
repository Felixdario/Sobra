import type { MonthSummary } from '@financas/shared';
import { money, percent, percentagePoints, signedMoney } from '../lib/format';
import { monthName, type MonthProgress } from '../lib/month';
import { Delta } from './Delta';
import styles from './KpiStrip.module.css';
import { savingsHeadline } from './model';

type KpiStripProps = { summary: MonthSummary; progress: MonthProgress };

function SavingsCell({ summary, progress, base }: KpiStripProps & { base: string }) {
  const headline = savingsHeadline(summary, progress);
  return (
    <div className={styles.cell}>
      <dt className={styles.label}>Taxa de poupança</dt>
      {headline.kind === 'rate' ? (
        <>
          <dd className={`${styles.value} num`}>{percent(headline.rate)}</dd>
          {headline.previous === null ? null : (
            <dd>
              <Delta
                size="small"
                change={headline.rate - headline.previous}
                upIsGood
                value={percentagePoints(headline.rate - headline.previous)}
                base={`vs ${base}`}
              />
            </dd>
          )}
        </>
      ) : headline.kind === 'partial' ? (
        <>
          <dd className={styles.pending}>Em aberto</dd>
          <dd className={styles.note}>
            Fecha no fim do mês · parcial, dia {headline.day} de {headline.days}
          </dd>
        </>
      ) : (
        <>
          <dd className={styles.pending}>—</dd>
          <dd className={styles.note}>Sem receitas no mês</dd>
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
  return (
    <div className={styles.cell}>
      <dt className={styles.label}>{label}</dt>
      <dd className={`${styles.value} ${debt && value < 0 ? styles.debt : ''} num`}>
        {money(value)}
      </dd>
      <dd>
        {note ? (
          <span className={styles.note}>{note}</span>
        ) : (
          <Delta
            size="small"
            change={change}
            upIsGood={upIsGood}
            value={signedMoney(change)}
            base={`vs ${base}`}
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
  const base = monthName(summary.previous.month);
  const partialNote = progress.partial ? `até o dia ${progress.day}` : null;
  return (
    <dl className={styles.strip}>
      <MoneyCell
        label="Saldo total"
        value={summary.balance}
        change={summary.delta.balance.absolute}
        upIsGood
        base={base}
        debt
      />
      <MoneyCell
        label="Receitas"
        value={summary.income}
        change={summary.delta.income.absolute}
        upIsGood
        base={base}
        note={partialNote}
      />
      <MoneyCell
        label="Despesas"
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
