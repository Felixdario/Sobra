import type { ReactNode } from 'react';
import { useDocumentTitle } from '../i18n/useDocumentTitle';
import styles from './Page.module.css';

export function Page({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  useDocumentTitle(title);
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{title}</h1>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </header>
      {children}
    </div>
  );
}

export function Panel({
  title,
  titleId,
  children,
  aside,
}: {
  title?: string;
  titleId?: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className={styles.panel} aria-labelledby={titleId}>
      {title ? (
        <header className={styles.panelHead}>
          <h2 id={titleId} className={styles.panelTitle}>
            {title}
          </h2>
          {aside}
        </header>
      ) : null}
      {children}
    </section>
  );
}

/** DESIGN.md, "Vazio": keep the frame and teach the next step, with the action. */
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className={styles.empty}>
      <p className={styles.emptyTitle}>{title}</p>
      {children}
    </div>
  );
}
