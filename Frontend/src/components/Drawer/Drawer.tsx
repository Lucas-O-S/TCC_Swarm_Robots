import type { ReactNode } from 'react';
import { useEffect } from 'react';
import styles from './Drawer.module.css';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

// Painel deslizante lateral (esquerda, logo abaixo da barra de navegação) —
// como o Modal, mas não bloqueia o mapa: fica montado sempre, só desliza pra
// fora quando fechado (permite a transição), pra editar algo pontual (ex.:
// obstáculo selecionado) sem interromper o resto da tela. Aberto, empurra o
// conteúdo da tela pra direita (ver `.content` em AppLayout.module.css, que
// reage ao `data-drawer-open`).
export function Drawer({ open, onClose, title, children }: DrawerProps) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  return (
    <aside className={`${styles.drawer} ${open ? styles.open : ''}`} aria-hidden={!open} data-drawer-open={open}>
      <div className={styles.header}>
        {title && <h3 className={styles.title}>{title}</h3>}
        <button type="button" className={styles.close} onClick={onClose} aria-label="Fechar">
          ×
        </button>
      </div>
      <div className={styles.content}>{children}</div>
    </aside>
  );
}
