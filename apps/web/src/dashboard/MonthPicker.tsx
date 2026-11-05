import { nextMonth, previousMonth, type MonthKey } from '@sobra/shared';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../components/Button';
import { monthTitle } from '../lib/month';
import styles from './MonthPicker.module.css';

type MonthPickerProps = {
  month: MonthKey;
  current: MonthKey;
  onChange: (month: MonthKey) => void;
};

export function MonthPicker({ month, current, onChange }: MonthPickerProps) {
  const previous = previousMonth(month);
  const next = nextMonth(month);
  const atCurrent = month >= current;
  return (
    <div className={styles.picker} role="group" aria-label="Mês">
      <Button
        variant="ghost"
        iconOnly
        aria-label={`Mês anterior: ${monthTitle(previous)}`}
        onClick={() => onChange(previous)}
      >
        <ChevronLeft size={20} strokeWidth={1.75} aria-hidden="true" />
      </Button>
      <span className={styles.label} aria-live="polite">
        {monthTitle(month)}
      </span>
      <Button
        variant="ghost"
        iconOnly
        aria-label={
          atCurrent ? 'Próximo mês (este é o mês atual)' : `Próximo mês: ${monthTitle(next)}`
        }
        disabled={atCurrent}
        onClick={() => onChange(next)}
      >
        <ChevronRight size={20} strokeWidth={1.75} aria-hidden="true" />
      </Button>
      {atCurrent ? null : (
        <Button variant="secondary" className={styles.today} onClick={() => onChange(current)}>
          Mês atual
        </Button>
      )}
    </div>
  );
}
