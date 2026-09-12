import { useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { ObstaclesModel } from '../../model/Obstacles.Model';

interface Rect {
  startPointX: number;
  startPointY: number;
  sizeX: number;
  sizeY: number;
}

type DragState =
  | { mode: 'draw'; startCol: number; startRow: number; col: number; row: number }
  | {
      mode: 'move';
      index: number;
      originX: number;
      originY: number;
      grabCol: number;
      grabRow: number;
      col: number;
      row: number;
    };

function clampStart(value: number, size: number, total: number) {
  const max = Math.max(0, total - size);
  return Math.min(max, Math.max(0, value));
}

function cellFromEvent(e: ReactPointerEvent<HTMLDivElement>, cols: number, rows: number) {
  const rect = e.currentTarget.getBoundingClientRect();
  const col = Math.min(cols - 1, Math.max(0, Math.floor(((e.clientX - rect.left) / rect.width) * cols)));
  const row = Math.min(rows - 1, Math.max(0, Math.floor(((e.clientY - rect.top) / rect.height) * rows)));
  return { col, row };
}

function obstacleIndexAt(col: number, row: number, obstacles: ObstaclesModel[]) {
  return obstacles.findIndex(
    (o) => col >= o.startPointX && col < o.startPointX + o.sizeX && row >= o.startPointY && row < o.startPointY + o.sizeY,
  );
}

interface UseObstacleEditorArgs {
  sizeX: number;
  sizeY: number;
  obstacles: ObstaclesModel[];
  onChange: (obstacles: ObstaclesModel[]) => void;
}

// Edição de obstáculos direto no grid, por clicar-e-arrastar: arrastar a
// partir de uma célula vazia desenha um obstáculo novo (retângulo entre o
// ponto inicial e o final do arraste); arrastar a partir de um obstáculo
// existente reposiciona ele. `stopPropagation` no pointerdown evita que o
// pan do MapViewport (mesmo gesto) capture o arraste no lugar.
export function useObstacleEditor({ sizeX, sizeY, obstacles, onChange }: UseObstacleEditorArgs) {
  const [drag, setDrag] = useState<DragState | null>(null);

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    const { col, row } = cellFromEvent(e, sizeX, sizeY);
    const hitIndex = obstacleIndexAt(col, row, obstacles);

    e.currentTarget.setPointerCapture(e.pointerId);
    e.stopPropagation();

    if (hitIndex >= 0) {
      const obstacle = obstacles[hitIndex];
      setDrag({
        mode: 'move',
        index: hitIndex,
        originX: obstacle.startPointX,
        originY: obstacle.startPointY,
        grabCol: col,
        grabRow: row,
        col,
        row,
      });
    } else {
      setDrag({ mode: 'draw', startCol: col, startRow: row, col, row });
    }
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!drag) return;
    e.stopPropagation();
    const { col, row } = cellFromEvent(e, sizeX, sizeY);
    setDrag((prev) => (prev ? { ...prev, col, row } : prev));
  }

  function handlePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (!drag) return;
    e.stopPropagation();
    e.currentTarget.releasePointerCapture(e.pointerId);

    if (drag.mode === 'draw') {
      const startPointX = Math.min(drag.startCol, drag.col);
      const startPointY = Math.min(drag.startRow, drag.row);
      const newSizeX = Math.abs(drag.col - drag.startCol) + 1;
      const newSizeY = Math.abs(drag.row - drag.startRow) + 1;

      onChange([
        ...obstacles,
        {
          name: `Obstáculo ${obstacles.length + 1}`,
          description: '',
          sizeX: newSizeX,
          sizeY: newSizeY,
          obstacles: true,
          startPointX,
          startPointY,
          cenarioId: '',
        },
      ]);
    } else {
      const obstacle = obstacles[drag.index];
      const startPointX = clampStart(drag.originX + (drag.col - drag.grabCol), obstacle.sizeX, sizeX);
      const startPointY = clampStart(drag.originY + (drag.row - drag.grabRow), obstacle.sizeY, sizeY);

      onChange(obstacles.map((o, i) => (i === drag.index ? { ...o, startPointX, startPointY } : o)));
    }

    setDrag(null);
  }

  function cancelDrag() {
    setDrag(null);
  }

  function removeObstacle(index: number) {
    onChange(obstacles.filter((_, i) => i !== index));
  }

  function rectFor(obstacle: ObstaclesModel, index: number): Rect {
    if (drag?.mode === 'move' && drag.index === index) {
      return {
        startPointX: clampStart(drag.originX + (drag.col - drag.grabCol), obstacle.sizeX, sizeX),
        startPointY: clampStart(drag.originY + (drag.row - drag.grabRow), obstacle.sizeY, sizeY),
        sizeX: obstacle.sizeX,
        sizeY: obstacle.sizeY,
      };
    }
    return obstacle;
  }

  const previewRect: Rect | null =
    drag?.mode === 'draw'
      ? {
          startPointX: Math.min(drag.startCol, drag.col),
          startPointY: Math.min(drag.startRow, drag.row),
          sizeX: Math.abs(drag.col - drag.startCol) + 1,
          sizeY: Math.abs(drag.row - drag.startRow) + 1,
        }
      : null;

  return {
    rectFor,
    previewRect,
    removeObstacle,
    gridHandlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: cancelDrag,
    },
  };
}
