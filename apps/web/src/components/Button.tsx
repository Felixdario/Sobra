import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  block?: boolean;
  iconOnly?: boolean;
  loading?: boolean;
};

function buttonClass(variant: ButtonVariant = 'secondary', extra = ''): string {
  return [styles.button, styles[variant], extra].filter(Boolean).join(' ');
}

export function Button({
  variant = 'secondary',
  block = false,
  iconOnly = false,
  loading = false,
  type = 'button',
  className = '',
  disabled,
  children,
  ...rest
}: ButtonProps) {
  const classes = [block ? styles.block : '', iconOnly ? styles.iconOnly : '', className]
    .filter(Boolean)
    .join(' ');
  return (
    <button
      type={type}
      className={buttonClass(variant, classes)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
