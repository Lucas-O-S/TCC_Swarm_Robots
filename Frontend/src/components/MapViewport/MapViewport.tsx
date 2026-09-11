import { useRef, useState } from 'react';
import type { PointerEvent, PropsWithChildren, ReactNode, WheelEvent } from 'react';
import {
  DEFAULT_MAX_ZOOM,
  DEFAULT_MIN_ZOOM,
  DEFAULT_VIEWPORT_HEIGHT,
  DEFAULT_VIEWPORT_WIDTH,
  ZOOM_STEP,
} from '../../Consts/MapConsts';
import styles from './MapViewport.module.css';

interface MapViewportProps extends PropsWithChildren {
  width?: number;
  height?: number;
  minZoom?: number;
  maxZoom?: number;
  /** Conteúdo extra fixo sobre o quadro (não sofre pan/zoom), ex.: legenda de escala. */
  overlay?: ReactNode;
}

interface DragState {
  startX: number;
  startY: number;
  panX: number;
  panY: number;
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
  children,
}: MapViewportProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<DragState | null>(null);

  function clampZoom(value: number) {
    return Math.min(maxZoom, Math.max(minZoom, value));
  }

  function handleWheel(e: WheelEvent<HTMLDivElement>) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom((z) => clampZoom(z + delta));
  }

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    setPan({
      x: drag.current.panX + (e.clientX - drag.current.startX),
      y: drag.current.panY + (e.clientY - drag.current.startY),
    });
  }

  function handlePointerUp() {
    drag.current = null;
  }

  function reset() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  return (
    <div className={styles.frame} style={{ width, height }}>
      <div
        className={styles.surface}
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
        </div>
      </div>

      <div className={styles.controls}>
        <button type="button" onClick={() => setZoom((z) => clampZoom(z + ZOOM_STEP))}>
          +
        </button>
        <button type="button" onClick={() => setZoom((z) => clampZoom(z - ZOOM_STEP))}>
          −
        </button>
        <button type="button" onClick={reset}>
          ⟲
        </button>
      </div>

      {overlay}
    </div>
  );
}
