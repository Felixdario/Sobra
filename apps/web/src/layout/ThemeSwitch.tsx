import { Monitor, Moon, Sun } from 'lucide-react';
import { useId } from 'react';
import type { ThemePreference } from '../theme/theme';
import { useTheme } from '../theme/themeContext';
import styles from './ThemeSwitch.module.css';

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'system', label: 'Sistema', icon: Monitor },
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
];

/** A segmented radio group: the choice is persisted and applied before paint on the next load. */
export function ThemeSwitch() {
  const { preference, setPreference } = useTheme();
  const name = useId();
  return (
    <fieldset className={styles.switch}>
      <legend className={styles.legend}>Tema</legend>
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
            <span>{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
