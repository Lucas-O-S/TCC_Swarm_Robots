import type { ReactNode } from 'react';
import styles from './StatusLine.module.css';

export type StatusTone = 'on' | 'warn' | 'off' | 'muted';

interface StatusLineProps {
  /** Cor da bolinha na frente; sem tom, a linha sai sem bolinha. */
  tone?: StatusTone;
  /** Em linha com o que vem ao lado (header): não quebra, a não ser em tela estreita. */
  inline?: boolean;
  title?: string;
  className?: string;
  children: ReactNode;
}

// Linha de status em fonte mono com a bolinha colorida na frente — a dos
// cartões, listas, drawers e headers (Simulação e Visualizador).
export function StatusLine({ tone, inline = false, title, className = '', children }: StatusLineProps) {
  const Tag = inline ? 'span' : 'div';
  return (
    <Tag className={`${inline ? styles.inline : styles.line} ${className}`.trim()} title={title}>
      {tone && <span className={`${styles.dot} ${styles[tone]}`} />}
      <span className={styles.text}>{children}</span>
    </Tag>
  );
}

/** Separador "·" esmaecido entre os pedaços de uma linha de status. */
export function StatusSep() {
  return <span className={styles.sep}>·</span>;
}
