import { WifiOff } from 'lucide-react';
import { useOnline } from '../components/useOnline';
import { useI18n } from '../i18n/i18nContext';
import styles from './OfflineBanner.module.css';

/** DESIGN.md, "Sem rede": a quiet strip saying how old the numbers on screen are. */
export function OfflineBanner({ updatedAt }: { updatedAt: number }) {
  const online = useOnline();
  const { t, fmt } = useI18n();
  if (online) return null;
  return (
    <p className={styles.banner} role="status">
      <WifiOff size={16} strokeWidth={1.75} aria-hidden="true" />
      {updatedAt > 0
        ? t('web.states.offlineSince', { time: fmt.time(updatedAt) })
        : t('common.states.offlineHint')}
    </p>
  );
}
