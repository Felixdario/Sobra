import type { MonthKey } from '@sobra/shared';
import { Link, useSearchParams } from 'react-router';
import { useI18n } from '../i18n/i18nContext';
import { useDocumentTitle } from '../i18n/useDocumentTitle';
import { currentMonth, monthProgress, parseMonthParam } from '../lib/month';
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
  const { t, rich, fmt } = useI18n();
  const points = data.data?.points ?? [];
  const withData = points.filter((p) => p.income > 0 || p.expense > 0);
  const averageNet = withData.length
    ? Math.round(withData.reduce((sum, p) => sum + p.net, 0) / withData.length)
    : 0;
  const current = points.at(-1);
  return (
    <ChartCard
      title={t('web.dashboard.charts.incomeExpense.title')}
      aside={t('web.dashboard.charts.incomeExpense.aside')}
      query={data}
      failure={t('web.dashboard.charts.incomeExpense.failed')}
      height={px(INCOME_EXPENSE_HEIGHT)}
      empty={withData.length === 0 ? <p>{t('web.dashboard.charts.incomeExpense.empty')}</p> : null}
      summary={
        current
          ? rich('web.dashboard.charts.incomeExpense.summary', {
              month: fmt.monthName(month),
              income: <span className="num">{fmt.money(current.income)}</span>,
              expense: <span className="num">{fmt.money(current.expense)}</span>,
              average: <span className="num">{fmt.signedMoney(averageNet)}</span>,
            })
          : null
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
  const { t, rich, fmt } = useI18n();
  const spending = data.data;
  const top = spending ? categoryRows(spending, t)[0] : undefined;
  return (
    <ChartCard
      title={t('web.dashboard.charts.category.title')}
      aside={spending ? <span className="num">{fmt.money(spending.total)}</span> : null}
      query={data}
      failure={t('web.dashboard.charts.category.failed')}
      height="calc(var(--layout-row-compact) * 6)"
      empty={
        spending && spending.items.length === 0 ? (
          <p>
            {rich('web.dashboard.charts.category.empty', {
              month: fmt.monthName(month),
              link: <Link to="/transacoes">{t('web.dashboard.charts.category.emptyLink')}</Link>,
            })}
          </p>
        ) : null
      }
      summary={
        top
          ? rich('web.dashboard.charts.category.summary', {
              name: top.name,
              amount: <span className="num">{fmt.money(top.amount)}</span>,
              month: fmt.monthName(month),
            })
          : null
      }
    >
      {() => (spending ? <CategoryChart spending={spending} /> : null)}
    </ChartCard>
  );
}

function BalanceCard({ data }: { data: DashboardData['balance'] }) {
  const { t, rich, fmt } = useI18n();
  const points = data.data?.points ?? [];
  const first = points[0];
  const last = points.at(-1);
  return (
    <ChartCard
      title={t('web.dashboard.charts.balance.title')}
      aside={t('web.dashboard.charts.balance.aside')}
      query={data}
      failure={t('web.dashboard.charts.balance.failed')}
      height={px(BALANCE_HEIGHT)}
      empty={points.length === 0 ? <p>{t('web.dashboard.charts.balance.empty')}</p> : null}
      summary={
        first && last
          ? rich('web.dashboard.charts.balance.summary', {
              from: <span className="num">{fmt.money(first.balance)}</span>,
              to: <span className="num">{fmt.money(last.balance)}</span>,
              change: <span className="num">{fmt.signedMoney(last.balance - first.balance)}</span>,
              month: fmt.monthLong(first.date.slice(0, 7) as MonthKey),
            })
          : null
      }
      table={data.data ? <BalanceTable history={data.data} /> : null}
    >
      {(ids) => (data.data ? <BalanceChart history={data.data} {...ids} /> : null)}
    </ChartCard>
  );
}

function BudgetCard({ data, month }: { data: DashboardData['budgets']; month: MonthKey }) {
  const { t, rich, fmt } = useI18n();
  const budgets = data.data;
  const over = budgets?.items.filter((item) => item.actual > item.budgeted).length ?? 0;
  const href = month === currentMonth(new Date()) ? '/orcamentos' : `/orcamentos?mes=${month}`;
  const monthName = fmt.monthName(month);
  return (
    <ChartCard
      title={t('web.dashboard.charts.budget.title')}
      aside={
        budgets && budgets.items.length > 0 ? (
          <span className="num">
            {t('web.dashboard.charts.budget.aside', {
              actual: fmt.money(budgets.totals.actual),
              budgeted: fmt.money(budgets.totals.budgeted),
            })}
          </span>
        ) : null
      }
      query={data}
      failure={t('web.dashboard.charts.budget.failed')}
      height="calc(var(--space-16) * 3)"
      empty={
        budgets && budgets.items.length === 0 ? (
          <p>
            {rich('web.dashboard.charts.budget.empty', {
              month: monthName,
              link: <Link to={href}>{t('web.dashboard.charts.budget.emptyLink')}</Link>,
            })}
          </p>
        ) : null
      }
      summary={
        budgets && budgets.items.length > 0
          ? over > 0
            ? t('web.dashboard.charts.budget.over', {
                over,
                total: budgets.items.length,
                month: monthName,
              })
            : t('web.dashboard.charts.budget.allWithin', {
                count: budgets.items.length,
                month: monthName,
              })
          : null
      }
    >
      {() => (budgets ? <BudgetChart budgets={budgets} href={href} /> : null)}
    </ChartCard>
  );
}

export function DashboardPage() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const now = new Date();
  const current = currentMonth(now);
  const month = parseMonthParam(params.get('mes'), now);
  const progress = monthProgress(month, now);
  const data = useDashboardData(month);
  useDocumentTitle(t('nav.dashboard'));

  const changeMonth = (next: MonthKey) =>
    setParams(next === current ? {} : { mes: next }, { preventScrollReset: true });

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t('nav.dashboard')}</h1>
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
