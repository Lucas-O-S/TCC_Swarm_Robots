import type { HTMLAttributes } from 'react';
import { DEFAULT_CELL, DEFAULT_COLS, DEFAULT_ROWS } from '../../Consts/MapConsts';
import styles from './Map.module.css';

interface MapProps extends HTMLAttributes<HTMLDivElement> {
  /** Colunas do grid. Ver Consts/MapConsts. */
  cols?: number;
  /** Linhas do grid. Ver Consts/MapConsts. */
  rows?: number;
  /** Tamanho de cada célula em pixels. Ver Consts/MapConsts. */
  cellSize?: number;
}

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
