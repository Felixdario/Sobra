import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../components/Button';
import { SelectField } from '../components/SelectField';
import { useI18n } from '../i18n/i18nContext';
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
  const { t, fmt } = useI18n();
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  return (
    <nav className={styles.pagination} aria-label={t('web.transactions.pagination.label')}>
      <p className={`${styles.range} num`} aria-live="polite">
        {t('web.transactions.pagination.range', {
          first: fmt.count(first),
          last: fmt.count(last),
          count: total,
        })}
      </p>
      <div className={styles.controls}>
        <SelectField
          label={t('web.transactions.pagination.perPage')}
          className={styles.size}
          value={String(pageSize)}
          onChange={(event) => onPageSize(Number(event.target.value))}
          options={PAGE_SIZES.map((size) => ({
            value: String(size),
            label: t('web.transactions.pagination.perPageOption', { size }),
          }))}
          hideLabel
        />
        <Button
          variant="ghost"
          iconOnly
          aria-label={t('web.transactions.pagination.previous')}
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft size={20} strokeWidth={1.75} aria-hidden="true" />
        </Button>
        <span className={`${styles.page} num`}>
          {t('web.transactions.pagination.page', { page, pages: Math.max(totalPages, 1) })}
        </span>
        <Button
          variant="ghost"
          iconOnly
          aria-label={t('web.transactions.pagination.next')}
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          <ChevronRight size={20} strokeWidth={1.75} aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
