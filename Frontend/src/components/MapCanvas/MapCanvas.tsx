import { useEffect, useRef, useState } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import type { MapModel } from '../../model/Map.Model';
import { BLOCK_AREA_CM2, BLOCK_SIDE_M, DEFAULT_CELL, DEFAULT_COLS, DEFAULT_ROWS } from '../../Consts/MapConsts';
import { Map } from '../Map/Map';
import { MapViewport } from '../MapViewport/MapViewport';
import type { AreaSelectRect, BaseTool } from '../MapViewport/MapViewport';
import styles from './MapCanvas.module.css';

/** Retângulo em unidade de célula (fracionária — não alinhado à grade), já convertido a partir do px de `AreaSelectRect`. */
export interface CellSelectRect {
  startPointX: number;
  startPointY: number;
  sizeX: number;
  sizeY: number;
}

interface MapCanvasProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  cols?: number;
  rows?: number;
  cellSize?: number;
  minZoom?: number;
  maxZoom?: number;
  /** Quando presente, `cenario.sizeX/sizeY` prevalecem sobre `cols`/`rows`. */
  mapModel?: MapModel;
  /** Quando true, ignora `cellSize` e calcula a célula a partir da largura disponível do container pai, então o mapa cresce/encolhe pra preencher o espaço em vez de ficar em tamanho fixo. */
  fitWidth?: boolean;
  /** Com `fitWidth`, o mapa também preenche essa altura (px) por completo — a célula deixa de ser quadrada (vira retângulo) quando a proporção cols:rows não bate com largura:altura disponíveis. */
  maxHeight?: number;
  /**
   * Conteúdo posicionado sobre o grid (robôs, obstáculos...). Como função,
   * recebe o tamanho de célula (px) já calculado — necessário com
   * `fitWidth`, já que aí a célula não é conhecida por quem chama.
   */
  children?: ReactNode | ((cellWidth: number, cellHeight: number) => ReactNode);
  /** Botões extra no canto de controles, ao lado do zoom (ver MapViewport). */
  tools?: ReactNode;
  /** Ferramenta ativa controlada de fora (ver MapViewport) — só necessário com uma ferramenta extra própria da tela. */
  tool?: string;
  /** Vem sempre junto com `tool` (ver MapViewport). */
  onToolChange?: (tool: BaseTool) => void;
  /** Ferramenta "Selecionar": mesmo retângulo do MapViewport, já convertido de px pra célula (ver CellSelectRect). */
  onAreaSelect?: (rect: CellSelectRect, meta: { additive: boolean }) => void;
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
  tools,
  tool,
  onToolChange,
  onAreaSelect,
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

  const effectiveCellWidth =
    fitWidth && containerWidth ? Math.max(1, Math.floor(containerWidth / effectiveCols)) : cellSize;
  const effectiveCellHeight =
    fitWidth && maxHeight ? Math.max(1, Math.floor(maxHeight / effectiveRows)) : effectiveCellWidth;

  const mapWidth = effectiveCols * effectiveCellWidth;
  const mapHeight = effectiveRows * effectiveCellHeight;

  const content = typeof children === 'function' ? children(effectiveCellWidth, effectiveCellHeight) : children;

  function handleAreaSelect(pixelRect: AreaSelectRect, meta: { additive: boolean }) {
    onAreaSelect?.(
      {
        startPointX: pixelRect.x / effectiveCellWidth,
        startPointY: pixelRect.y / effectiveCellHeight,
        sizeX: pixelRect.width / effectiveCellWidth,
        sizeY: pixelRect.height / effectiveCellHeight,
      },
      meta,
    );
  }

  return (
    <div ref={containerRef} className={fitWidth ? styles.fluid : undefined}>
      <MapViewport
        width={mapWidth}
        height={mapHeight}
        minZoom={minZoom}
        maxZoom={maxZoom}
        overlay={
          <span className={styles.scale}>
            1 bloco = {BLOCK_AREA_CM2} m² ({BLOCK_SIDE_M} × {BLOCK_SIDE_M} m)
          </span>
        }
        tools={tools}
        tool={tool}
        onToolChange={onToolChange}
        onAreaSelect={onAreaSelect ? handleAreaSelect : undefined}
      >
        <Map
          cols={effectiveCols}
          rows={effectiveRows}
          cellWidth={effectiveCellWidth}
          cellHeight={effectiveCellHeight}
          {...rest}
        >
          {content}
        </Map>
      </MapViewport>
    </div>
  );
}
