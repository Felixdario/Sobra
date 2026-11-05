import { Table2 } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { Button } from '../../components/Button';
import { ErrorLine } from '../../components/ErrorLine';
import { Skeleton } from '../../components/Skeleton';
import styles from './ChartCard.module.css';

type QueryState = {
  isPending: boolean;
  isError: boolean;
  isFetching: boolean;
  isPlaceholderData: boolean;
  error: unknown;
  refetch: () => unknown;
};

type ChartCardProps = {
  title: string;
  /** The conclusion, in words: also the chart's accessible description. */
  summary?: ReactNode;
  aside?: ReactNode;
  query: QueryState;
  /** What failed, for the error line: "Não deu para carregar os gastos por categoria". */
  failure: string;
  empty?: ReactNode;
  /** Height of the plot, kept by the skeleton so nothing shifts when data arrives. */
  height: string;
  table?: ReactNode;
  children?: (ids: { titleId: string; descId: string }) => ReactNode;
};

export function ChartCard({
  title,
  summary,
  aside,
  query,
  failure,
  empty,
  height,
  table,
  children,
}: ChartCardProps) {
  const titleId = useId();
  const descId = useId();
  const tableId = useId();
  const [showTable, setShowTable] = useState(false);
  const ready = !query.isPending && !query.isError;

  return (
    <section
      className={styles.card}
      aria-labelledby={titleId}
      aria-busy={query.isPending || query.isPlaceholderData}
    >
      <header className={styles.head}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        {aside ? <span className={styles.aside}>{aside}</span> : null}
      </header>
      {query.isError ? (
        <div className={styles.frame} style={{ minHeight: height }}>
          <ErrorLine
            what={failure}
            error={query.error}
            onRetry={() => void query.refetch()}
            retrying={query.isFetching}
          />
        </div>
      ) : query.isPending ? (
        <div className={styles.frame} aria-hidden="true">
          <Skeleton width="80%" height="var(--text-body-sm-line)" />
          <Skeleton height={height} />
        </div>
      ) : empty ? (
        <div className={`${styles.frame} ${styles.empty}`} style={{ minHeight: height }}>
          {empty}
        </div>
      ) : (
        <div className={styles.body} data-stale={query.isPlaceholderData}>
          {summary ? (
            <p id={descId} className={styles.summary}>
              {summary}
            </p>
          ) : null}
          <div style={{ minHeight: height }}>{children?.({ titleId, descId })}</div>
          {table ? (
            <div className={styles.tableToggle}>
              <Button
                variant="ghost"
                aria-expanded={showTable}
                aria-controls={tableId}
                onClick={() => setShowTable((value) => !value)}
              >
                <Table2 size={16} strokeWidth={1.75} aria-hidden="true" />
                {showTable ? 'Ocultar tabela' : 'Ver tabela'}
              </Button>
            </div>
          ) : null}
          {table && showTable && ready ? (
            <div id={tableId} className={styles.table}>
              {table}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
