import type { HTMLAttributes } from 'react';
import { Map } from '../Map/Map';
import { MapViewport } from '../MapViewport/MapViewport';
import styles from './MapCanvas.module.css';

interface MapCanvasProps extends HTMLAttributes<HTMLDivElement> {
  cols?: number;
  rows?: number;
  cellSize?: number;
  minZoom?: number;
  maxZoom?: number;
}

const DEFAULT_COLS = 14;
const DEFAULT_ROWS = 8;
const DEFAULT_CELL = 32;

// Escala real representada por cada bloco (célula) do grid.
const BLOCK_AREA_CM2 = 0.04;
const BLOCK_SIDE_M = Math.sqrt(BLOCK_AREA_CM2);

// <Map> (grid puro) dentro de <MapViewport> (quadro com zoom/arraste). O
// quadro nasce do tamanho exato do mapa (cols * cellSize x rows * cellSize),
// então o estado inicial mostra o mapa inteiro, sem sobra nem corte — zoom
// e arraste só entram depois que o usuário mexe.
export function MapCanvas({
  cols = DEFAULT_COLS,
  rows = DEFAULT_ROWS,
  cellSize = DEFAULT_CELL,
  minZoom,
  maxZoom,
  children,
  ...rest
}: MapCanvasProps) {
  return (
    <MapViewport
      width={cols * cellSize}
      height={rows * cellSize}
      minZoom={minZoom}
      maxZoom={maxZoom}
      overlay={
        <span className={styles.scale}>
          1 bloco = {BLOCK_AREA_CM2} m² ({BLOCK_SIDE_M} × {BLOCK_SIDE_M} m)
        </span>
      }
    >
      <Map cols={cols} rows={rows} cellSize={cellSize} {...rest}>
        {children}
      </Map>
    </MapViewport>
  );
}
