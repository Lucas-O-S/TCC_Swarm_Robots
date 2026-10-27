import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Badge.module.css';

export type BadgeTone = 'muted' | 'green' | 'red' | 'yellow' | 'blue' | 'dark';

interface BadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  tone?: BadgeTone;
  children: ReactNode;
}

// Etiqueta curta de status (ONLINE, Active, Running...) — fundo na cor do
// tema, texto branco em fonte mono. Mesmo espírito do <StatusHex>, mas com
// texto: usada nas listas e drawers da Simulação.
export function Badge({ tone = 'muted', className = '', children, ...rest }: BadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[tone] ?? ''} ${className}`.trim()} {...rest}>
      {children}
    </span>
  );
}
