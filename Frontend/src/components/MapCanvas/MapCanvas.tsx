import { useEffect, useRef, useState } from 'react';
import type { HTMLAttributes, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import type { MapModel } from '../../model/Map.Model';
import { BLOCK_AREA_CM2, BLOCK_SIDE_M, DEFAULT_CELL, DEFAULT_COLS, DEFAULT_ROWS } from '../../Consts/MapConsts';
import { Map } from '../Map/Map';
import { MapViewport } from '../MapViewport/MapViewport';
import type { AreaSelectRect, BaseTool } from '../MapViewport/MapViewport';
import { MapElementsProvider, useMapElementsState } from '../../hooks/useMapElements';
import type { MapElementsController } from '../../hooks/useMapElements';
import type { ElementBounds } from '../../hooks/useSelectableElements';
import styles from './MapCanvas.module.css';

/** Retângulo em unidade de célula (fracionária — não alinhado à grade). */
export interface CellSelectRect {
  startPointX: number;
  startPointY: number;
  sizeX: number;
  sizeY: number;
}

interface CreateDragState {
  startX: number;
  startY: number;
  x: number;
  y: number;
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
   * `fitWidth`, já que aí a célula não é conhecida por quem chama. Qualquer
   * elemento aqui dentro pode usar `useMapElement` (ver src/hooks/useMapElements.tsx)
   * pra ganhar seleção/movimento de graça — não precisa de nada extra desta tela.
   */
  children?: ReactNode | ((cellWidth: number, cellHeight: number) => ReactNode);
  /** Botões extra no canto de controles, ao lado do zoom (ver MapViewport). */
  tools?: ReactNode;
  /** Ferramenta ativa controlada de fora (ver MapViewport) — só necessário com uma ferramenta extra própria da tela. */
  tool?: string;
  /** Vem sempre junto com `tool` (ver MapViewport). */
  onToolChange?: (tool: BaseTool) => void;
  /**
   * Escape hatch específico de tela (não é uma capacidade genérica de
   * elemento): quando `tool === createTool`, arrastar numa célula vazia
   * (sem nenhum elemento registrado ali) desenha esse retângulo e chama
   * `onCreateElement` ao soltar, em vez de cair no pan/seleção padrão do
   * mapa — ex.: a ferramenta "obstáculo" do CenarioBuilder.
   */
  createTool?: string;
  onCreateElement?: (rect: CellSelectRect) => void;
  /** Visual do retângulo enquanto desenha (px, relativo ao mapa) — só relevante junto com `createTool`/`onCreateElement`. */
  renderCreatePreview?: (rect: ElementBounds) => ReactNode;
  /**
   * Painel/drawer de detalhes (ex.: edição do elemento selecionado) — no
   * mesmo contexto de seleção do que está dentro do mapa (`useMapSelection`),
   * mas renderizado fora da área com pan/zoom (ver comentário no `return`).
   * Só serve pra overlays de posição fixa (ex.: um Drawer). Pra um painel de
   * layout normal em outro lugar da tela (ex.: uma lista lateral fora do
   * `<MapCanvas>`), use `elements` em vez disso.
   */
  panel?: ReactNode;
  /**
   * Estado de seleção/movimento criado por fora (`useMapElementsState()`) —
   * só necessário quando ALGO fora deste `<MapCanvas>` (ex.: uma lista
   * lateral no layout normal da tela) também precisa ler/escrever a mesma
   * seleção via `useMapSelection`. Nesse caso a tela cria o estado, envolve
   * tanto o `<MapCanvas>` quanto esse outro painel num
   * `<MapElementsProvider>` próprio, e passa o mesmo objeto aqui. Sem essa
   * prop, o `<MapCanvas>` cria e provê o estado sozinho (caso comum).
   */
  elements?: MapElementsController;
}

// <Map> (grid puro) dentro de <MapViewport> (quadro com zoom/arraste). O
// quadro nasce do tamanho exato do mapa (cols * cellSize x rows * cellSize),
// então o estado inicial mostra o mapa inteiro, sem sobra nem corte — zoom
// e arraste só entram depois que o usuário mexe. Também provê o contexto de
// seleção/movimento genérico (ver useMapElements) pra tudo que for
// renderizado dentro — nenhuma tela precisa ligar pointer handler à mão.
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
  createTool,
  onCreateElement,
  renderCreatePreview,
  panel,
  elements: elementsProp,
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

  // Sempre chamado (regra dos hooks) mesmo quando `elementsProp` acaba
  // sendo usado no lugar — ver comentário da prop `elements`.
  const ownElements = useMapElementsState();
  const mapElements = elementsProp ?? ownElements;

  useEffect(() => {
    mapElements.setViewportSize({ width: mapWidth, height: mapHeight });
  }, [mapElements, mapWidth, mapHeight]);

  const [createDrag, setCreateDrag] = useState<CreateDragState | null>(null);
  const canCreate = tool !== undefined && tool === createTool && !!onCreateElement;

  const content = typeof children === 'function' ? children(effectiveCellWidth, effectiveCellHeight) : children;

  function pointFromEvent(e: ReactPointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * mapWidth,
      y: ((e.clientY - rect.top) / rect.height) * mapHeight,
    };
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (mapElements.handlers.onPointerDown(e)) return;
    if (!canCreate) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    e.stopPropagation();
    const { x, y } = pointFromEvent(e);
    setCreateDrag({ startX: x, startY: y, x, y });
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (mapElements.handlers.onPointerMove(e)) return;
    if (!createDrag) return;
    e.stopPropagation();
    const { x, y } = pointFromEvent(e);
    setCreateDrag((prev) => (prev ? { ...prev, x, y } : prev));
  }

  function handlePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (mapElements.handlers.onPointerUp(e)) return;
    if (!createDrag) return;
    e.stopPropagation();
    e.currentTarget.releasePointerCapture(e.pointerId);

    const x = Math.min(createDrag.startX, createDrag.x);
    const y = Math.min(createDrag.startY, createDrag.y);
    const width = Math.abs(createDrag.x - createDrag.startX);
    const height = Math.abs(createDrag.y - createDrag.startY);
    setCreateDrag(null);

    onCreateElement?.({
      startPointX: x / effectiveCellWidth,
      startPointY: y / effectiveCellHeight,
      sizeX: width / effectiveCellWidth,
      sizeY: height / effectiveCellHeight,
    });
  }

  function handlePointerCancel() {
    mapElements.handlers.onPointerCancel();
    setCreateDrag(null);
  }

  function handleAreaSelect(pixelRect: AreaSelectRect, meta: { additive: boolean }) {
    mapElements.selectInRect(pixelRect, meta.additive);
  }

  const createPreviewRect: ElementBounds | null = createDrag
    ? {
        x: Math.min(createDrag.startX, createDrag.x),
        y: Math.min(createDrag.startY, createDrag.y),
        width: Math.abs(createDrag.x - createDrag.startX),
        height: Math.abs(createDrag.y - createDrag.startY),
      }
    : null;

  return (
    <div ref={containerRef} className={fitWidth ? styles.fluid : undefined}>
      <MapElementsProvider value={mapElements.contextValue}>
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
          onAreaSelect={handleAreaSelect}
        >
          <Map
            cols={effectiveCols}
            rows={effectiveRows}
            cellWidth={effectiveCellWidth}
            cellHeight={effectiveCellHeight}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            {...rest}
          >
            {content}
            {createPreviewRect && renderCreatePreview?.(createPreviewRect)}
          </Map>
        </MapViewport>

        {/*
          Fora do <MapViewport> de propósito: ele tem `transform` no `.content`
          (pan/zoom), e um `transform` em qualquer ancestral vira o
          "containing block" de descendentes `position: fixed` — um Drawer
          aqui dentro passaria a colar (e ser cortado) junto do mapa em vez
          de flutuar sobre a tela inteira. `panel` fica no mesmo Provider
          (então ainda lê useMapSelection()/useMapElement) mas fora do
          transform.
        */}
        {panel}
      </MapElementsProvider>
    </div>
  );
}
