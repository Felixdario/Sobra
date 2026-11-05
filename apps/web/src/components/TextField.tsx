import { CircleAlert } from 'lucide-react';
import { useId, type InputHTMLAttributes, type Ref, type TextareaHTMLAttributes } from 'react';
import styles from './TextField.module.css';

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string | undefined;
  hint?: string;
  hideLabel?: boolean;
  compact?: boolean;
  ref?: Ref<HTMLInputElement>;
};

export function TextField({
  label,
  error,
  hint,
  hideLabel = false,
  compact = false,
  id,
  ref,
  className = '',
  ...input
}: TextFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const messageId = `${inputId}-message`;
  const message = error ?? hint;
  return (
    <div className={`${styles.field} ${className}`}>
      <label className={hideLabel ? 'visually-hidden' : styles.label} htmlFor={inputId}>
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        className={`${styles.input} ${compact ? styles.compact : ''}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        {...input}
      />
      {error ? (
        <p id={messageId} className={styles.error}>
          <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className={styles.hint}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string | undefined;
  ref?: Ref<HTMLTextAreaElement>;
};

/** Multi-line sibling of TextField for free text (notes up to 500 characters). */
export function TextAreaField({
  label,
  error,
  id,
  ref,
  className = '',
  ...textarea
}: TextAreaFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const messageId = `${inputId}-message`;
  return (
    <div className={`${styles.field} ${className}`}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
      </label>
      <textarea
        ref={ref}
        id={inputId}
        className={`${styles.input} ${styles.textarea}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? messageId : undefined}
        {...textarea}
      />
      {error ? (
        <p id={messageId} className={styles.error}>
          <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
