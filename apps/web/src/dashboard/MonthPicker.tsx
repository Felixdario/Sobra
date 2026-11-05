import { nextMonth, previousMonth, type MonthKey } from '@sobra/shared';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../components/Button';
import { useI18n } from '../i18n/i18nContext';
import styles from './MonthPicker.module.css';

type MonthPickerProps = {
  month: MonthKey;
  current: MonthKey;
  onChange: (month: MonthKey) => void;
};

export function MonthPicker({ month, current, onChange }: MonthPickerProps) {
  const { t, fmt } = useI18n();
  const previous = previousMonth(month);
  const next = nextMonth(month);
  const atCurrent = month >= current;
  return (
    <div className={styles.picker} role="group" aria-label={t('web.monthPicker.group')}>
      <Button
        variant="ghost"
        iconOnly
        aria-label={t('web.monthPicker.previous', { month: fmt.monthTitle(previous) })}
        onClick={() => onChange(previous)}
      >
        <ChevronLeft size={20} strokeWidth={1.75} aria-hidden="true" />
      </Button>
      <span className={styles.label} aria-live="polite">
        {fmt.monthTitle(month)}
      </span>
      <Button
        variant="ghost"
        iconOnly
        aria-label={
          atCurrent
            ? t('web.monthPicker.nextDisabled')
            : t('web.monthPicker.next', { month: fmt.monthTitle(next) })
        }
        disabled={atCurrent}
        onClick={() => onChange(next)}
      >
        <ChevronRight size={20} strokeWidth={1.75} aria-hidden="true" />
      </Button>
      {atCurrent ? null : (
        <Button variant="secondary" className={styles.today} onClick={() => onChange(current)}>
          {t('web.monthPicker.current')}
        </Button>
      )}
    </div>
  );
}
