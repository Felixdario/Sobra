import { Monitor, Moon, Sun } from 'lucide-react';
import { useId } from 'react';
import type { MessageKey } from '@sobra/i18n';
import { useI18n } from '../i18n/i18nContext';
import type { ThemePreference } from '../theme/theme';
import { useTheme } from '../theme/themeContext';
import styles from './ThemeSwitch.module.css';

const OPTIONS: {
  value: ThemePreference;
  label: Extract<MessageKey, `web.theme.${string}`>;
  icon: typeof Sun;
}[] = [
  { value: 'system', label: 'web.theme.system', icon: Monitor },
  { value: 'light', label: 'web.theme.light', icon: Sun },
  { value: 'dark', label: 'web.theme.dark', icon: Moon },
];

/** A segmented radio group: the choice is persisted and applied before paint on the next load. */
export function ThemeSwitch() {
  const { preference, setPreference } = useTheme();
  const name = useId();
  const { t } = useI18n();
  return (
    <fieldset className={styles.switch}>
      <legend className={styles.legend}>{t('web.theme.legend')}</legend>
      <div className={styles.track}>
        {OPTIONS.map(({ value, label, icon: Icon }) => (
          <label key={value} className={styles.option}>
            <input
              type="radio"
              name={name}
              value={value}
              checked={preference === value}
              onChange={() => setPreference(value)}
              className={styles.input}
            />
            <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
            <span>{t(label)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
