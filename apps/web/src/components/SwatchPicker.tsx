import type { IconName } from '@sobra/shared';
import { ICON_NAMES } from '@sobra/shared';
import { identityColors } from '@sobra/tokens';
import { useId } from 'react';
import { ICON_LABELS, ICONS } from '../lib/icons';
import styles from './SwatchPicker.module.css';

type ColorPickerProps = {
  value: string;
  onChange: (hex: string) => void;
  error?: string | undefined;
};

/**
 * The identity palette as a radio group (arrow keys move, Space selects). A color outside the
 * palette (set before it existed, or by the API) is kept and shown as the first option.
 */
export function ColorPicker({ value, onChange, error }: ColorPickerProps) {
  const name = useId();
  const known = identityColors.some((c) => c.hex.toLowerCase() === value.toLowerCase());
  const options =
    known || !value ? identityColors : [{ name: 'Atual', hex: value }, ...identityColors];
  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>Cor</legend>
      <div className={styles.grid}>
        {options.map((color) => (
          <label key={color.hex} className={styles.swatch} title={color.name}>
            <input
              type="radio"
              name={name}
              value={color.hex}
              checked={value.toLowerCase() === color.hex.toLowerCase()}
              onChange={() => onChange(color.hex)}
              className={styles.input}
            />
            <span className={styles.chip} style={{ background: color.hex }} aria-hidden="true" />
            <span className="visually-hidden">{color.name}</span>
          </label>
        ))}
      </div>
      {error ? <p className={styles.error}>{error}</p> : null}
    </fieldset>
  );
}

type IconPickerProps = { value: IconName; onChange: (icon: IconName) => void };

export function IconPicker({ value, onChange }: IconPickerProps) {
  const name = useId();
  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>Ícone</legend>
      <div className={styles.grid}>
        {ICON_NAMES.map((icon) => {
          const Icon = ICONS[icon];
          return (
            <label
              key={icon}
              className={`${styles.swatch} ${styles.icon}`}
              title={ICON_LABELS[icon]}
            >
              <input
                type="radio"
                name={name}
                value={icon}
                checked={value === icon}
                onChange={() => onChange(icon)}
                className={styles.input}
              />
              <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
              <span className="visually-hidden">{ICON_LABELS[icon]}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
