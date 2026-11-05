import { APP_NAME } from '@sobra/shared';
import { Link } from 'react-router';
import styles from './BrandMark.module.css';

/** The month ruler in miniature: three ink planes and the cobalt "sobra". */
export function BrandMark() {
  return (
    <span className={styles.mark} aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </span>
  );
}

export function BrandLockup({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className={styles.lockup} aria-label={`${APP_NAME}, ir para o painel`}>
      <BrandMark />
      <span className={styles.word}>{APP_NAME}</span>
    </Link>
  );
}
