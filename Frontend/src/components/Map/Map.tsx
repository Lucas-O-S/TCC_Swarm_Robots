import type { HTMLAttributes } from 'react';
import { DEFAULT_CELL, DEFAULT_COLS, DEFAULT_ROWS } from '../../Consts/MapConsts';
import styles from './Map.module.css';

interface MapProps extends HTMLAttributes<HTMLDivElement> {
  /** Colunas do grid. Ver Consts/MapConsts. */
  cols?: number;
  /** Linhas do grid. Ver Consts/MapConsts. */
  rows?: number;
  /** Tamanho de cada célula em pixels (largura e altura). Ver Consts/MapConsts. */
  cellSize?: number;
  /** Sobrescreve a largura da célula (px), independente de `cellSize`. */
  cellWidth?: number;
  /** Sobrescreve a altura da célula (px), independente de `cellSize`. */
  cellHeight?: number;
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
  cellWidth,
  cellHeight,
  className = '',
  style,
  children,
  ...rest
}: MapProps) {
  const effectiveCellWidth = cellWidth ?? cellSize;
  const effectiveCellHeight = cellHeight ?? cellSize;

  return (
    <div
      className={`${styles.grid} ${className}`}
      style={{
        width: cols * effectiveCellWidth,
        height: rows * effectiveCellHeight,
        backgroundSize: `${effectiveCellWidth}px ${effectiveCellHeight}px`,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
