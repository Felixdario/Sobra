import { CircleAlert } from 'lucide-react';
import styles from './Form.module.css';

export function FormError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return (
    <p className={styles.formError} role="alert">
      <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
      {message}
    </p>
  );
}
