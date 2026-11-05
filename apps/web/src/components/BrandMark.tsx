import { APP_NAME } from '@sobra/shared';
import { Link } from 'react-router';
import { useI18n } from '../i18n/i18nContext';
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
  const { t } = useI18n();
  return (
    <Link to={to} className={styles.lockup} aria-label={t('web.brand.home', { app: APP_NAME })}>
      <BrandMark />
      <span className={styles.word}>{APP_NAME}</span>
    </Link>
  );
}
