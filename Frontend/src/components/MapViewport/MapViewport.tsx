import { useRef, useState } from 'react';
import type { PointerEvent, PropsWithChildren, ReactNode, WheelEvent } from 'react';
import {
  DEFAULT_MAX_ZOOM,
  DEFAULT_MIN_ZOOM,
  DEFAULT_VIEWPORT_HEIGHT,
  DEFAULT_VIEWPORT_WIDTH,
  ZOOM_STEP,
} from '../../Consts/MapConsts';
import { MapToolButton } from '../MapToolButton/MapToolButton';
import { MoveIcon, SelectIcon } from '../MapToolButton/icons';
import styles from './MapViewport.module.css';

export type BaseTool = 'move' | 'select';

/** Retângulo em px "de conteúdo" (unidade do mapa antes do pan/zoom) — mesma unidade de `width`/`height`. */
export interface AreaSelectRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface MapViewportProps extends PropsWithChildren {
  width?: number;
  height?: number;
  minZoom?: number;
  maxZoom?: number;
  /** Conteúdo extra fixo sobre o quadro (não sofre pan/zoom), ex.: legenda de escala. */
  overlay?: ReactNode;
  /** Botões extra no canto de controles, ao lado do zoom (ex.: <MapToolButton>). */
  tools?: ReactNode;
  /**
   * Ferramenta ativa, controlada de fora — só precisa disso quem tem uma
   * ferramenta extra (ex.: "obstáculo" no CenarioBuilder) que deve entrar
   * no mesmo grupo exclusivo de Mover/Selecionar (só uma ativa por vez).
   * Sem isso, o componente controla sozinho (começa em "move"). Vem
   * sempre acompanhado de `onToolChange`.
   */
  tool?: string;
  /** Chamado quando o usuário clica Mover ou Selecionar (os botões que o próprio MapViewport renderiza). Obrigatório junto com `tool`. */
  onToolChange?: (tool: BaseTool) => void;
  /**
   * Ferramenta "Selecionar": arrastar sobre uma área vazia do mapa desenha
   * esse retângulo (o componente já cuida do desenho/pan/zoom) e, ao
   * soltar, chama com o retângulo final — genérico, não sabe o que tem
   * dentro dele (quem chama decide o que fazer, ex.: selecionar
   * obstáculos que intersectam). Sem essa prop, arrastar em área vazia com
   * "Selecionar" não faz nada (mesmo comportamento de sempre).
   */
  onAreaSelect?: (rect: AreaSelectRect, meta: { additive: boolean }) => void;
}

interface DragState {
  startX: number;
  startY: number;
  panX: number;
  panY: number;
}

interface AreaSelectState {
  startX: number;
  startY: number;
  x: number;
  y: number;
  additive: boolean;
}

// Quadro com recorte fixo (overflow: hidden) pra ver só uma parte do mapa
// por vez. O conteúdo (ex.: <Map>...</Map>) é movido/escalado via CSS
// transform (translate + scale) — sem lib externa, mesmo espírito dos
// outros componentes do projeto (CSS puro).
export function MapViewport({
  width = DEFAULT_VIEWPORT_WIDTH,
  height = DEFAULT_VIEWPORT_HEIGHT,
  minZoom = DEFAULT_MIN_ZOOM,
  maxZoom = DEFAULT_MAX_ZOOM,
  overlay,
  tools,
  tool,
  onToolChange,
  onAreaSelect,
  children,
}: MapViewportProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<DragState | null>(null);
  const [areaSelect, setAreaSelect] = useState<AreaSelectState | null>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  // Ferramenta base de todo mapa (mover/pan vs. só clicar/selecionar) — vem
  // pronta em qualquer tela que use <MapCanvas>/<MapViewport>, sem precisar
  // de nada de fora (estado interno). Quando a tela tem uma ferramenta
  // extra (ex.: obstáculo no CenarioBuilder) que precisa entrar no mesmo
  // grupo exclusivo, ela passa `tool`/`onToolChange` e passa a controlar
  // tudo (inclusive Mover/Selecionar) — padrão controlado/não-controlado,
  // igual um <input value/defaultValue>.
  const [internalTool, setInternalTool] = useState<BaseTool>('move');
  const activeTool = tool ?? internalTool;

  function selectBaseTool(next: BaseTool) {
    if (tool === undefined) setInternalTool(next);
    onToolChange?.(next);
  }

  function clampZoom(value: number) {
    return Math.min(maxZoom, Math.max(minZoom, value));
  }

  function handleWheel(e: WheelEvent<HTMLDivElement>) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom((z) => clampZoom(z + delta));
  }

  // Ponto do evento em px "de conteúdo" — desfaz o translate/scale atual,
  // então quem recebe (onAreaSelect) não precisa saber de pan/zoom.
  function contentPointFromClient(clientX: number, clientY: number) {
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: (clientX - rect.left - pan.x) / zoom, y: (clientY - rect.top - pan.y) / zoom };
  }

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    if (activeTool === 'move') {
      e.currentTarget.setPointerCapture(e.pointerId);
      drag.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
      return;
    }

    if (activeTool === 'select') {
      // Caixa de seleção é comportamento padrão da ferramenta "Selecionar"
      // em qualquer tela, mesmo sem `onAreaSelect` — sem callback, ela só
      // aparece e some ao soltar, sem efeito (nada consome o retângulo).
      e.currentTarget.setPointerCapture(e.pointerId);
      const { x, y } = contentPointFromClient(e.clientX, e.clientY);
      setAreaSelect({ startX: x, startY: y, x, y, additive: e.ctrlKey || e.metaKey });
    }
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (drag.current) {
      setPan({
        x: drag.current.panX + (e.clientX - drag.current.startX),
        y: drag.current.panY + (e.clientY - drag.current.startY),
      });
      return;
    }

    if (areaSelect) {
      const { x, y } = contentPointFromClient(e.clientX, e.clientY);
      setAreaSelect((prev) => (prev ? { ...prev, x, y } : prev));
    }
  }

  function handlePointerUp() {
    if (drag.current) {
      drag.current = null;
      return;
    }

    if (areaSelect) {
      onAreaSelect?.(
        {
          x: Math.min(areaSelect.startX, areaSelect.x),
          y: Math.min(areaSelect.startY, areaSelect.y),
          width: Math.abs(areaSelect.x - areaSelect.startX),
          height: Math.abs(areaSelect.y - areaSelect.startY),
        },
        { additive: areaSelect.additive },
      );
      setAreaSelect(null);
    }
  }

  function reset() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  return (
    <div className={styles.frame} style={{ width, height }}>
      <div
        ref={surfaceRef}
        className={`${styles.surface} ${activeTool === 'move' ? styles.grabCursor : ''}`.trim()}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <div
          className={styles.content}
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
        >
          {children}

          {areaSelect && (
            <div
              className={styles.areaSelect}
              style={{
                position: 'absolute',
                left: Math.min(areaSelect.startX, areaSelect.x),
                top: Math.min(areaSelect.startY, areaSelect.y),
                width: Math.abs(areaSelect.x - areaSelect.startX),
                height: Math.abs(areaSelect.y - areaSelect.startY),
              }}
            />
          )}
        </div>
      </div>

      <div className={styles.controls}>
        <MapToolButton
          active={activeTool === 'move'}
          onClick={() => selectBaseTool('move')}
          title="Mover mapa (clicar e arrastar)"
        >
          <MoveIcon />
        </MapToolButton>
        <MapToolButton
          active={activeTool === 'select'}
          onClick={() => selectBaseTool('select')}
          title="Selecionar (clique simples)"
        >
          <SelectIcon />
        </MapToolButton>

        {tools}

        <MapToolButton variant="click" onClick={() => setZoom((z) => clampZoom(z + ZOOM_STEP))} title="Mais zoom">
          +
        </MapToolButton>
        <MapToolButton variant="click" onClick={() => setZoom((z) => clampZoom(z - ZOOM_STEP))} title="Menos zoom">
          −
        </MapToolButton>
        <MapToolButton variant="click" onClick={reset} title="Redefinir zoom/posição">
          ⟲
        </MapToolButton>
      </div>

      {overlay}
    </div>
  );
}
