import type { ReactNode } from 'react';
import { Card } from '../Card/Card';
import styles from './Menu.module.css';

interface MenuProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

// Painel lateral reutilizável (título opcional + conteúdo em coluna) —
// usado como o "menu" de configuração ao lado do mapa em telas como
// CenarioBuilder, e reaproveitável em qualquer outro menu de mesma forma.
export function Menu({ title, children, className = '' }: MenuProps) {
  return (
    <aside className={`${styles.menu} ${className}`}>
      <Card className={styles.card}>
        {title && <h3 className={styles.title}>{title}</h3>}
        {children}
      </Card>
    </aside>
  );
}
