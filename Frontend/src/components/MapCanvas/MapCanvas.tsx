import type { HTMLAttributes } from 'react';
import type { MapModel } from '../../model/Map.Model';
import { BLOCK_AREA_CM2, BLOCK_SIDE_M, DEFAULT_CELL, DEFAULT_COLS, DEFAULT_ROWS } from '../../Consts/MapConsts';
import { Map } from '../Map/Map';
import { MapViewport } from '../MapViewport/MapViewport';
import styles from './MapCanvas.module.css';

interface MapCanvasProps extends HTMLAttributes<HTMLDivElement> {
  cols?: number;
  rows?: number;
  cellSize?: number;
  minZoom?: number;
  maxZoom?: number;
  /** Quando presente, `cenario.sizeX/sizeY` prevalecem sobre `cols`/`rows`. */
  mapModel?: MapModel;
}

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
  mapModel,
  children,
  ...rest
}: MapCanvasProps) {
  const effectiveCols = mapModel?.cenario.sizeX ?? cols;
  const effectiveRows = mapModel?.cenario.sizeY ?? rows;

  return (
    <MapViewport
      width={effectiveCols * cellSize}
      height={effectiveRows * cellSize}
      minZoom={minZoom}
      maxZoom={maxZoom}
      overlay={
        <span className={styles.scale}>
          1 bloco = {BLOCK_AREA_CM2} m² ({BLOCK_SIDE_M} × {BLOCK_SIDE_M} m)
        </span>
      }
    >
      <Map cols={effectiveCols} rows={effectiveRows} cellSize={cellSize} {...rest}>
        {children}
      </Map>
    </MapViewport>
  );
}
