import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../components/Button';
import { count } from '../lib/format';
import { SelectField } from '../components/SelectField';
import { PAGE_SIZES } from './listState';
import styles from './Pagination.module.css';

type Props = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPage: (page: number) => void;
  onPageSize: (pageSize: number) => void;
};

export function Pagination({ page, pageSize, total, totalPages, onPage, onPageSize }: Props) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  return (
    <nav className={styles.pagination} aria-label="Paginação">
      <p className={`${styles.range} num`} aria-live="polite">
        {count(first)}–{count(last)} de {count(total)} {total === 1 ? 'transação' : 'transações'}
      </p>
      <div className={styles.controls}>
        <SelectField
          label="Por página"
          className={styles.size}
          value={String(pageSize)}
          onChange={(event) => onPageSize(Number(event.target.value))}
          options={PAGE_SIZES.map((size) => ({ value: String(size), label: `${size} por página` }))}
          hideLabel
        />
        <Button
          variant="ghost"
          iconOnly
          aria-label="Página anterior"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft size={20} strokeWidth={1.75} aria-hidden="true" />
        </Button>
        <span className={`${styles.page} num`}>
          Página {count(page)} de {count(Math.max(totalPages, 1))}
        </span>
        <Button
          variant="ghost"
          iconOnly
          aria-label="Próxima página"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          <ChevronRight size={20} strokeWidth={1.75} aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
