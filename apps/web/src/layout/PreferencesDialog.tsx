import { queryKeys } from '@sobra/client/query';
import { DISPLAY_CURRENCIES, LOCALES, type User } from '@sobra/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Languages } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../components/Button';
import { SelectField } from '../components/SelectField';
import { Sheet } from '../components/Sheet';
import { useI18n } from '../i18n/i18nContext';
import { useServices } from '../lib/servicesContext';
import styles from './PreferencesDialog.module.css';

/**
 * Language and display currency (ADR-035), saved on the user through the API. The choice shows
 * at once: `me` is updated before the request (the whole app re-renders from it) and put back
 * if the API refuses.
 */
function PreferencesForm() {
  const { mutations } = useServices();
  const queryClient = useQueryClient();
  const { t, locale, currency, errorText } = useI18n();
  const save = useMutation(mutations.auth.updatePreferences);

  const change = (patch: Partial<Pick<User, 'locale' | 'currency'>>) => {
    const previous = queryClient.getQueryData<User>(queryKeys.me());
    if (previous) queryClient.setQueryData<User>(queryKeys.me(), { ...previous, ...patch } as User);
    save.mutate(patch, {
      onError: (error) => {
        if (previous) queryClient.setQueryData<User>(queryKeys.me(), previous);
        toast.error(t('web.preferences.saveFailed', { reason: errorText(error) }));
      },
    });
  };

  return (
    <div className={styles.form}>
      <SelectField
        label={t('preferences.language')}
        value={locale}
        data-autofocus
        onChange={(event) => change({ locale: event.target.value as User['locale'] })}
        options={LOCALES.map((value) => ({ value, label: t(`preferences.locales.${value}`) }))}
      />
      <SelectField
        label={t('preferences.currency')}
        value={currency}
        onChange={(event) => change({ currency: event.target.value as User['currency'] })}
        options={DISPLAY_CURRENCIES.map((value) => ({
          value,
          label: t(`preferences.currencies.${value}`),
        }))}
      />
      <p className={styles.hint}>{t('preferences.currencyHint')}</p>
    </div>
  );
}

export function PreferencesButton() {
  const { t, locale, currency } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" className={styles.trigger} onClick={() => setOpen(true)}>
        <Languages size={16} strokeWidth={1.75} aria-hidden="true" />
        <span className={styles.triggerText}>
          <span>{t('web.preferences.open')}</span>
          <span className={styles.current}>
            {t(`preferences.locales.${locale}`)} · {currency}
          </span>
        </span>
      </Button>
      <Sheet
        open={open}
        variant="center"
        title={t('preferences.title')}
        onClose={() => setOpen(false)}
        footer={
          <Button variant="primary" onClick={() => setOpen(false)}>
            {t('common.actions.close')}
          </Button>
        }
      >
        {open ? <PreferencesForm /> : null}
      </Sheet>
    </>
  );
}
