import { centsToReais, parseBRL, type Cents } from '@financas/shared';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Button } from '../components/Button';
import styles from './BudgetsPage.module.css';

type Props = {
  label: string;
  initial: Cents | null;
  onSave: (amount: Cents) => void;
  onCancel: () => void;
  saving?: boolean;
};

/** Edits a value in place: Enter saves, Esc cancels, focus lands in the field. */
export function InlineAmount({ label, initial, onSave, onCancel, saving = false }: Props) {
  const [value, setValue] = useState(initial === null ? '' : centsToReais(initial));
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const errorId = useId();

  useEffect(() => {
    input.current?.focus();
    input.current?.select();
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const amount = parseBRL(value);
    if (amount === null || amount <= 0) {
      setError('Informe um valor maior que zero, como 450,00');
      return;
    }
    onSave(amount);
  };

  return (
    <form className={styles.inline} onSubmit={submit} noValidate>
      <label className="visually-hidden" htmlFor={`${errorId}-input`}>
        {label}
      </label>
      <span className={styles.prefix} aria-hidden="true">
        R$
      </span>
      <input
        ref={input}
        id={`${errorId}-input`}
        className={`${styles.inlineInput} num`}
        inputMode="decimal"
        autoComplete="off"
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => {
          setValue(event.target.value);
          setError(null);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            onCancel();
          }
        }}
      />
      <Button type="submit" variant="primary" loading={saving}>
        Salvar
      </Button>
      <Button variant="ghost" onClick={onCancel}>
        Cancelar
      </Button>
      {error ? (
        <p id={errorId} className={styles.inlineError} role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
