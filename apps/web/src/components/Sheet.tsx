import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Button } from './Button';
import styles from './Sheet.module.css';

type SheetProps = {
  open: boolean;
  title: string;
  description?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** `side`: panel on the right (desktop) / bottom sheet (phone). `center`: small confirmation. */
  variant?: 'side' | 'center';
};

/**
 * Native modal <dialog>: focus moves inside, the page behind is inert and Esc closes. Focus goes
 * back to the element that opened it: the content unmounts before `close()`, so the browser's own
 * restore (which needs focus inside the dialog) would leave it on <body>.
 */
export function Sheet({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  variant = 'side',
}: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      opener.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
      // The first field, not the close button, when the content marks one.
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    }
    if (!open && dialog.open) {
      dialog.close();
      if (opener.current?.isConnected) opener.current.focus();
      opener.current = null;
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`${styles.sheet} ${variant === 'center' ? styles.center : styles.side}`}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {open ? (
        <div className={styles.panel}>
          <header className={styles.head}>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            <Button variant="ghost" iconOnly aria-label="Fechar" onClick={onClose}>
              <X size={20} strokeWidth={1.75} aria-hidden="true" />
            </Button>
          </header>
          {description ? (
            <div id={descId} className={styles.description}>
              {description}
            </div>
          ) : null}
          <div className={styles.body}>{children}</div>
          {footer ? <footer className={styles.footer}>{footer}</footer> : null}
        </div>
      ) : null}
    </dialog>
  );
}
