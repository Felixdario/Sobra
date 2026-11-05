import type { IconName } from '@sobra/shared';
import { ArrowLeftRight } from 'lucide-react';
import { ICONS } from '../lib/icons';
import styles from './IdentityMark.module.css';

type IdentityMarkProps = { color?: string | null; icon?: IconName | null; size?: 'row' | 'inline' };

/**
 * DESIGN.md, "Linha de transação": the user's color only as an 8px flat square beside an ink
 * icon (never a colored circle behind it). Without icon it is a transfer: the neutral ⇄.
 */
export function IdentityMark({ color, icon, size = 'row' }: IdentityMarkProps) {
  const Icon = icon ? ICONS[icon] : ArrowLeftRight;
  return (
    <span className={`${styles.mark} ${size === 'inline' ? styles.inline : ''}`} aria-hidden="true">
      <span className={styles.square} style={color ? { background: color } : undefined} />
      <Icon size={size === 'inline' ? 16 : 20} strokeWidth={1.75} />
    </span>
  );
}
