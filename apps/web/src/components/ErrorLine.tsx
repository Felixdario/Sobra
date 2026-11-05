import { isApiError } from '@sobra/client';
import { CircleAlert, WifiOff } from 'lucide-react';
import { useI18n } from '../i18n/i18nContext';
import { Button } from './Button';
import styles from './ErrorLine.module.css';

type ErrorLineProps = {
  /** What failed, as a sentence start: "Não deu para carregar o resumo". */
  what: string;
  error: unknown;
  onRetry: () => void;
  retrying?: boolean;
};

function isOffline(error: unknown): boolean {
  return isApiError(error) && (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT');
}

/** DESIGN.md "Erro": one line saying what failed and the way out, in place of the block. */
export function ErrorLine({ what, error, onRetry, retrying = false }: ErrorLineProps) {
  const { t } = useI18n();
  const offline = isOffline(error);
  const Icon = offline ? WifiOff : CircleAlert;
  return (
    <div className={styles.line} role="alert">
      <p className={styles.message}>
        <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
        {offline ? t('common.states.failedOffline', { what }) : t('web.states.failed', { what })}
      </p>
      <Button variant="secondary" onClick={onRetry} loading={retrying}>
        {t('common.actions.retry')}
      </Button>
    </div>
  );
}
