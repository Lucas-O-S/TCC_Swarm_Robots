import type { HTMLAttributes } from 'react';
import styles from './Map.module.css';

interface MapProps extends HTMLAttributes<HTMLDivElement> {
  /** Colunas do grid. Padrão 14 (mesmo valor usado no mapa do Dashboard). */
  cols?: number;
  /** Linhas do grid. Padrão 8 (idem). */
  rows?: number;
  /** Tamanho de cada célula em pixels. Padrão 32. */
  cellSize?: number;
}

const DEFAULT_COLS = 14;
const DEFAULT_ROWS = 8;
const DEFAULT_CELL = 32;

// Grade 2D vazia — só o "chão" do mapa (fundo quadriculado do tamanho
// cols x rows), sem robô, obstáculo, ponto de recarregamento ou clique
// próprios. `children` é aceito só pra permitir posicionar algo por cima
// (ex.: <Robot style={{ position: 'absolute', left, top }} />) já que o
// container tem `position: relative` — a lógica de onde colocar cada coisa
// fica por conta de quem usar este componente.
export function Map({
  cols = DEFAULT_COLS,
  rows = DEFAULT_ROWS,
  cellSize = DEFAULT_CELL,
  className = '',
  style,
  children,
  ...rest
}: MapProps) {
  return (
    <div
      className={`${styles.grid} ${className}`}
      style={{
        width: cols * cellSize,
        height: rows * cellSize,
        backgroundSize: `${cellSize}px ${cellSize}px`,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
