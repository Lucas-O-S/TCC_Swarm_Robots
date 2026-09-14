import type { HTMLAttributes } from 'react';
import styles from './Obstacle.module.css';

interface ObstacleProps extends HTMLAttributes<HTMLDivElement> {
  width: number;
  height: number;
  label?: string;
  /** Destaque de "selecionado" (ferramentas Selecionar/Obstáculo) — o próprio componente decide o estilo. */
  selected?: boolean;
}


export function Obstacle({ width, height, label, selected = false, className = '', style, ...rest }: ObstacleProps) {
  return (
    <div
      className={`${styles.obstacle} ${selected ? styles.selected : ''} ${className}`}
      style={{ width, height, ...style }}
      title={label}
      {...rest}
    >
      {label && <span className={styles.label}>{label}</span>}
    </div>
  );
}
