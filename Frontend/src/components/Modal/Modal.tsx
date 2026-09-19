import type { ReactNode } from 'react';
import { useEffect } from 'react';
import styles from './Modal.module.css';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
=
  closable?: boolean;
}

// Modal genérico: backdrop + card centralizado. Fecha ao clicar fora ou Esc
// (a menos que `closable={false}`).
export function Modal({ open, onClose, title, children, closable = true }: ModalProps) {
  useEffect(() => {
    if (!open || !closable) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, closable]);

  if (!open) return null;

  return (
    <div className={styles.backdrop} onMouseDown={closable ? onClose : undefined}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {title && (
          <div className={styles.header}>
            <h2 className={styles.title}>{title}</h2>
            {closable && (
              <button type="button" className={styles.close} onClick={onClose} aria-label="Fechar">
                ×
              </button>
            )}
          </div>
        )}
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
