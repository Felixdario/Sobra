import type { MonthKey, MonthSummary, SpendingByCategory } from '@sobra/shared';
import { Link } from 'react-router';
import { ErrorLine } from '../components/ErrorLine';
import { Skeleton } from '../components/Skeleton';
import { fitChars } from '../lib/fit';
import { money, percent, signedMoney } from '../lib/format';
import { monthName, monthTitle, type MonthProgress } from '../lib/month';
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
  return (
    <span className={styles.status}>
      {progress.partial ? `parcial · dia ${progress.day} de ${progress.days}` : 'mês fechado'}
    </span>
  );
}

function Headline({ summary, progress }: { summary: MonthSummary; progress: MonthProgress }) {
  const left = summary.income - summary.expense;
  const previousLeft = summary.previous.income - summary.previous.expense;
  const base = monthName(summary.previous.month);
  if (progress.partial) {
    return (
      <>
        <p className={styles.caption}>Sobra até agora</p>
        <p className={`${styles.figure} num`} style={fitChars(money(left))}>
          {money(left)}
        </p>
        <p className={styles.line}>
          Até agora: <span className="num">{money(summary.income)}</span> recebidos,{' '}
          <span className="num">{money(summary.expense)}</span> gastos · parcial, dia {progress.day}{' '}
          de {progress.days}
        </p>
      </>
    );
  }
  const change = left - previousLeft;
  return (
    <>
      <p className={styles.caption}>{left >= 0 ? 'Sobra do mês' : 'Faltou no mês'}</p>
      <p
        className={`${styles.figure} ${left < 0 ? styles.debt : ''} num`}
        style={fitChars(money(left))}
      >
        {money(left)}
      </p>
      <p className={styles.line}>
        {left >= 0 ? 'sobraram de' : 'gastos acima de'}{' '}
        <span className="num">{money(summary.income)}</span> recebidos
        {summary.savingsRate === null ? null : (
          <>
            {' '}
            · taxa de poupança <strong className="num">{percent(summary.savingsRate)}</strong>
          </>
        )}
      </p>
      <Delta
        change={change}
        upIsGood
        value={signedMoney(change)}
        base={`${change >= 0 ? 'a mais' : 'a menos'} que em ${base} (${money(previousLeft)})`}
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
  if (isEmptyMonth(summary)) {
    return (
      <>
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>Nenhum lançamento em {monthName(month)}.</p>
          <p>
            Receitas e despesas deste mês aparecem aqui.{' '}
            <Link to="/transacoes">Lance o primeiro gasto</Link>.
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
          ruler={buildRuler(summary, spending)}
          monthLabel={monthName(month)}
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
  const stale = summary.isPlaceholderData || spending.isPlaceholderData;
  return (
    <section
      className={styles.card}
      aria-labelledby="resumo-titulo"
      aria-busy={summary.isPending || stale}
    >
      <header className={styles.head}>
        <h2 id="resumo-titulo" className={styles.title}>
          {monthTitle(month)}
        </h2>
        <Status progress={progress} />
      </header>
      {summary.isError ? (
        <ErrorLine
          what="Não deu para carregar o resumo do mês"
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
