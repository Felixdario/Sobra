import { formatMonth, type MonthKey } from '@financas/shared';
import { Link, useSearchParams } from 'react-router';
import { money, signedMoney } from '../lib/format';
import { currentMonth, monthName, monthProgress, parseMonthParam } from '../lib/month';
import { BalanceChart, BalanceTable, BALANCE_HEIGHT } from './charts/BalanceChart';
import { BudgetChart } from './charts/BudgetChart';
import { CategoryChart } from './charts/CategoryChart';
import { ChartCard } from './charts/ChartCard';
import { categoryRows } from './charts/data';
import {
  IncomeExpenseChart,
  IncomeExpenseLegend,
  IncomeExpenseTable,
  INCOME_EXPENSE_HEIGHT,
} from './charts/IncomeExpenseChart';
import styles from './DashboardPage.module.css';
import { MonthPicker } from './MonthPicker';
import { OfflineBanner } from './OfflineBanner';
import { SummaryCard } from './SummaryCard';
import { useDashboardData, type DashboardData } from './useDashboardData';

const px = (value: number) => `${value}px`;

function IncomeExpenseCard({ data, month }: { data: DashboardData['history']; month: MonthKey }) {
  const points = data.data?.points ?? [];
  const withData = points.filter((p) => p.income > 0 || p.expense > 0);
  const averageNet = withData.length
    ? Math.round(withData.reduce((sum, p) => sum + p.net, 0) / withData.length)
    : 0;
  const current = points.at(-1);
  return (
    <ChartCard
      title="Receitas × despesas"
      aside="últimos 6 meses"
      query={data}
      failure="Não deu para carregar receitas e despesas"
      height={px(INCOME_EXPENSE_HEIGHT)}
      empty={withData.length === 0 ? <p>Sem lançamentos nos últimos seis meses.</p> : null}
      summary={
        current ? (
          <>
            Em {monthName(month)} entraram <span className="num">{money(current.income)}</span> e
            saíram <span className="num">{money(current.expense)}</span>. Resultado médio dos meses
            com lançamentos: <span className="num">{signedMoney(averageNet)}</span>.
          </>
        ) : null
      }
      table={<IncomeExpenseTable points={points} />}
    >
      {(ids) => (
        <div className={styles.chartStack}>
          <IncomeExpenseLegend />
          <IncomeExpenseChart points={points} {...ids} />
        </div>
      )}
    </ChartCard>
  );
}

function CategoryCard({ data, month }: { data: DashboardData['spending']; month: MonthKey }) {
  const spending = data.data;
  const top = spending ? categoryRows(spending)[0] : undefined;
  return (
    <ChartCard
      title="Gastos por categoria"
      aside={spending ? <span className="num">{money(spending.total)}</span> : null}
      query={data}
      failure="Não deu para carregar os gastos por categoria"
      height="calc(var(--layout-row-compact) * 6)"
      empty={
        spending && spending.items.length === 0 ? (
          <p>
            Sem gastos em {monthName(month)}. <Link to="/transacoes">Lançar um gasto</Link>
          </p>
        ) : null
      }
      summary={
        top ? (
          <>
            {top.name} levou a maior parte: <span className="num">{money(top.amount)}</span> em{' '}
            {monthName(month)}.
          </>
        ) : null
      }
    >
      {() => (spending ? <CategoryChart spending={spending} /> : null)}
    </ChartCard>
  );
}

function BalanceCard({ data }: { data: DashboardData['balance'] }) {
  const points = data.data?.points ?? [];
  const first = points[0];
  const last = points.at(-1);
  return (
    <ChartCard
      title="Evolução do saldo"
      aside="saldo total, por dia"
      query={data}
      failure="Não deu para carregar a evolução do saldo"
      height={px(BALANCE_HEIGHT)}
      empty={points.length === 0 ? <p>Sem histórico de saldo ainda.</p> : null}
      summary={
        first && last ? (
          <>
            O saldo total foi de <span className="num">{money(first.balance)}</span> para{' '}
            <span className="num">{money(last.balance)}</span> (
            <span className="num">{signedMoney(last.balance - first.balance)}</span>) desde{' '}
            {formatMonth(first.date.slice(0, 7) as MonthKey)}.
          </>
        ) : null
      }
      table={data.data ? <BalanceTable history={data.data} /> : null}
    >
      {(ids) => (data.data ? <BalanceChart history={data.data} {...ids} /> : null)}
    </ChartCard>
  );
}

function BudgetCard({ data, month }: { data: DashboardData['budgets']; month: MonthKey }) {
  const budgets = data.data;
  const over = budgets?.items.filter((item) => item.actual > item.budgeted).length ?? 0;
  const href = month === currentMonth(new Date()) ? '/orcamentos' : `/orcamentos?mes=${month}`;
  return (
    <ChartCard
      title="Orçado × realizado"
      aside={
        budgets && budgets.items.length > 0 ? (
          <span className="num">
            {money(budgets.totals.actual)} de {money(budgets.totals.budgeted)}
          </span>
        ) : null
      }
      query={data}
      failure="Não deu para carregar os orçamentos"
      height="calc(var(--space-16) * 3)"
      empty={
        budgets && budgets.items.length === 0 ? (
          <p>
            Sem orçamento para {monthName(month)}. <Link to={href}>Definir orçamentos</Link>
          </p>
        ) : null
      }
      summary={
        budgets && budgets.items.length > 0
          ? over > 0
            ? `${over} de ${budgets.items.length} orçamentos passaram do limite em ${monthName(month)}.`
            : `Todos os ${budgets.items.length} orçamentos dentro do limite em ${monthName(month)}.`
          : null
      }
    >
      {() => (budgets ? <BudgetChart budgets={budgets} href={href} /> : null)}
    </ChartCard>
  );
}

export function DashboardPage() {
  const [params, setParams] = useSearchParams();
  const now = new Date();
  const current = currentMonth(now);
  const month = parseMonthParam(params.get('mes'), now);
  const progress = monthProgress(month, now);
  const data = useDashboardData(month);

  const changeMonth = (next: MonthKey) =>
    setParams(next === current ? {} : { mes: next }, { preventScrollReset: true });

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Painel</h1>
        <MonthPicker month={month} current={current} onChange={changeMonth} />
      </header>
      <OfflineBanner updatedAt={data.summary.dataUpdatedAt} />
      <SummaryCard
        month={month}
        progress={progress}
        summary={data.summary}
        spending={data.spending}
      />
      <div className={styles.grid}>
        <IncomeExpenseCard data={data.history} month={month} />
        <BalanceCard data={data.balance} />
        <CategoryCard data={data.spending} month={month} />
        <BudgetCard data={data.budgets} month={month} />
      </div>
    </div>
  );
}
