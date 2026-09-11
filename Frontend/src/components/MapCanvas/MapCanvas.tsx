import { useEffect, useRef, useState } from 'react';
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
  /** Quando true, ignora `cellSize` e calcula a célula a partir da largura disponível do container pai, então o mapa cresce/encolhe pra preencher o espaço em vez de ficar em tamanho fixo. */
  fitWidth?: boolean;
  /** Com `fitWidth`, limita a altura visível do quadro (px) — a célula continua sendo calculada só pela largura (o mapa sempre preenche as laterais); se o mapa ficar mais alto que isso, o excesso vira scroll/pan dentro do quadro em vez de encolher a célula. */
  maxHeight?: number;
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
  fitWidth = false,
  maxHeight,
  children,
  ...rest
}: MapCanvasProps) {
  const effectiveCols = Math.max(1, mapModel?.cenario.sizeX ?? cols);
  const effectiveRows = Math.max(1, mapModel?.cenario.sizeY ?? rows);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);

  useEffect(() => {
    if (!fitWidth || !containerRef.current) return;

    const observer = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width));
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [fitWidth]);

  const effectiveCellSize =
    fitWidth && containerWidth ? Math.max(1, Math.floor(containerWidth / effectiveCols)) : cellSize;

  const mapWidth = effectiveCols * effectiveCellSize;
  const mapHeight = effectiveRows * effectiveCellSize;

  return (
    <div ref={containerRef} className={fitWidth ? styles.fluid : undefined}>
      <MapViewport
        width={mapWidth}
        height={maxHeight ? Math.min(mapHeight, maxHeight) : mapHeight}
        minZoom={minZoom}
        maxZoom={maxZoom}
        overlay={
          <span className={styles.scale}>
            1 bloco = {BLOCK_AREA_CM2} m² ({BLOCK_SIDE_M} × {BLOCK_SIDE_M} m)
          </span>
        }
      >
        <Map cols={effectiveCols} rows={effectiveRows} cellSize={effectiveCellSize} {...rest}>
          {children}
        </Map>
      </MapViewport>
    </div>
  );
}
