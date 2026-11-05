import type { ReactNode } from 'react';
import { BrandMark } from '../components/BrandMark';
import styles from './AuthLayout.module.css';

type AuthLayoutProps = { title: string; lead: string; children: ReactNode; footer: ReactNode };

export function AuthLayout({ title, lead, children, footer }: AuthLayoutProps) {
  return (
    <main className={styles.page}>
      <div className={styles.panel}>
        <div className={styles.intro}>
          <BrandMark />
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.lead}>{lead}</p>
        </div>
        <div className={styles.card}>{children}</div>
        <p className={styles.footer}>{footer}</p>
      </div>
    </main>
  );
}
