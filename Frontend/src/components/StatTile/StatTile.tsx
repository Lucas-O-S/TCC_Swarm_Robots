import type { ReactNode } from 'react';
import styles from './StatTile.module.css';

interface StatTileProps {
  label: string;
  value: ReactNode;
  /** Linha pequena embaixo do valor (de onde vem, quantos...). */
  detail?: ReactNode;
  title?: string;
}

// Número de destaque de um cartão: rótulo, valor grande e uma linha de
// contexto. Vários lado a lado com <StatTiles>.
export function StatTile({ label, value, detail, title }: StatTileProps) {
  return (
    <div className={styles.tile} title={title}>
      <span className={styles.label}>{label}</span>
      <strong className={styles.value}>{value}</strong>
      {detail && <span className={styles.detail}>{detail}</span>}
    </div>
  );
}

/** Fileira de StatTile dividindo a largura. */
export function StatTiles({ children }: { children: ReactNode }) {
  return <div className={styles.tiles}>{children}</div>;
}
