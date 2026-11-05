import { APP_NAME } from '@sobra/shared';
import { useEffect } from 'react';
import { useI18n } from './i18nContext';

/** "Transações · Sobra" / "Transactions · Sobra"; follows a language switch. */
export function useDocumentTitle(page: string) {
  const { t } = useI18n();
  useEffect(() => {
    document.title = t('web.app.documentTitle', { page, app: APP_NAME });
  }, [t, page]);
}
