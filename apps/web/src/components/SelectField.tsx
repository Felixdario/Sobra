import { CircleAlert } from 'lucide-react';
import { useId, type Ref, type SelectHTMLAttributes } from 'react';
import styles from './TextField.module.css';

export type SelectOption = { value: string; label: string };

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: readonly SelectOption[];
  error?: string | undefined;
  /** Visually hidden label (filters in a toolbar), still read by screen readers. */
  hideLabel?: boolean;
  ref?: Ref<HTMLSelectElement>;
};

/** Native <select>: platform keyboard and screen-reader behavior for free. */
export function SelectField({
  label,
  options,
  error,
  hideLabel = false,
  id,
  ref,
  className = '',
  ...select
}: SelectFieldProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const messageId = `${selectId}-message`;
  return (
    <div className={`${styles.field} ${className}`}>
      <label className={hideLabel ? 'visually-hidden' : styles.label} htmlFor={selectId}>
        {label}
      </label>
      <select
        ref={ref}
        id={selectId}
        className={`${styles.input} ${styles.select}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? messageId : undefined}
        {...select}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <p id={messageId} className={styles.error}>
          <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
