import { useEffect, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { ObstaclesModel } from '../../model/Obstacles.Model';

interface Rect {
  startPointX: number;
  startPointY: number;
  sizeX: number;
  sizeY: number;
}

interface MoveOrigin {
  index: number;
  originX: number;
  originY: number;
}

type DragState =
  | { mode: 'draw'; startCol: number; startRow: number; col: number; row: number }
  | {
      mode: 'move';
      /** Obstáculo que o usuário efetivamente agarrou — vira a seleção caso o gesto acabe sendo um clique sem arrasto. */
      grabIndex: number;
      /** Todo obstáculo movido junto (o grupo selecionado no momento do agarre, ou só `grabIndex` se ele não fazia parte de uma seleção). */
      origins: MoveOrigin[];
      grabCol: number;
      grabRow: number;
      col: number;
      row: number;
    }
  | {
      mode: 'marquee';
      startCol: number;
      startRow: number;
      col: number;
      row: number;
      /** Ctrl/Cmd segurado: soma à seleção existente em vez de substituí-la. */
      additive: boolean;
    };

// Maior deslocamento (num eixo) que dá pra aplicar em todo o grupo de uma
// vez sem nenhum obstáculo sair do mapa — assim o grupo anda "em bloco" e
// só para na borda, em vez de cada obstáculo travar num ponto diferente.
function clampGroupDelta(delta: number, items: { origin: number; size: number }[], total: number) {
  let min = -Infinity;
  let max = Infinity;
  for (const { origin, size } of items) {
    min = Math.max(min, -origin);
    max = Math.min(max, total - size - origin);
  }
  return Math.min(max, Math.max(min, delta));
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

// Próximo "Obstáculo N" livre — olha o maior N já usado (não só a
// quantidade), pra não repetir número depois de apagar um obstáculo no meio.
function nextObstacleName(obstacles: ObstaclesModel[]) {
  let max = 0;
  for (const o of obstacles) {
    const match = /^Obstáculo (\d+)$/.exec(o.name);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `Obstáculo ${max + 1}`;
}

type ObstacleTool = 'move' | 'select' | 'obstacle';

interface UseObstacleEditorArgs {
  /** "obstacle": desenha um novo (arraste em célula vazia) e move um existente. "select": só move um existente. "move": nenhum dos dois — arraste vira pan normal do MapViewport. */
  tool: ObstacleTool;
  sizeX: number;
  sizeY: number;
  obstacles: ObstaclesModel[];
  onChange: (obstacles: ObstaclesModel[]) => void;
}

// Edição de obstáculos direto no grid, por clicar-e-arrastar: arrastar a
// partir de uma célula vazia desenha um obstáculo novo (retângulo entre o
// ponto inicial e o final do arraste, só com a ferramenta "obstacle");
// arrastar a partir de um obstáculo existente reposiciona ele, e todo o
// resto da seleção junto (ferramenta "select" ou "obstacle"). Ctrl/Cmd +
// clique acrescenta ou remove um obstáculo da seleção sem mover nada.
// `stopPropagation` no pointerdown evita que o pan do MapViewport (mesmo
// gesto) capture o arraste no lugar; com a ferramenta "move" o handler nem
// entra nessa lógica, então o mapa se comporta como o componente base (pan
// normal), sem efeito colateral.
export function useObstacleEditor({ tool, sizeX, sizeY, obstacles, onChange }: UseObstacleEditorArgs) {
  const canDraw = tool === 'obstacle';
  const canMove = tool === 'select' || tool === 'obstacle';
  const [drag, setDrag] = useState<DragState | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!canDraw && !canMove) {
      setDrag(null);
      setSelectedIndices(new Set());
    }
  }, [canDraw, canMove]);

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!canDraw && !canMove) return;

    const { col, row } = cellFromEvent(e, sizeX, sizeY);
    const hitIndex = obstacleIndexAt(col, row, obstacles);

    if (hitIndex >= 0) {
      if (!canMove) return;
      e.stopPropagation();

      if (e.ctrlKey || e.metaKey) {
        // Ctrl/Cmd + clique só alterna a seleção — não inicia arrasto.
        setSelectedIndices((prev) => {
          const next = new Set(prev);
          if (next.has(hitIndex)) next.delete(hitIndex);
          else next.add(hitIndex);
          return next;
        });
        return;
      }

      // Clicou num obstáculo que já fazia parte da seleção: arrasta o grupo
      // inteiro. Senão, a seleção vira só ele (e é isso que arrasta).
      const group = selectedIndices.has(hitIndex) ? Array.from(selectedIndices) : [hitIndex];
      if (!selectedIndices.has(hitIndex)) setSelectedIndices(new Set([hitIndex]));

      e.currentTarget.setPointerCapture(e.pointerId);
      setDrag({
        mode: 'move',
        grabIndex: hitIndex,
        origins: group.map((index) => ({
          index,
          originX: obstacles[index].startPointX,
          originY: obstacles[index].startPointY,
        })),
        grabCol: col,
        grabRow: row,
        col,
        row,
      });
    } else if (canMove && !canDraw) {
      // Ferramenta "Selecionar": arrastar a partir de uma célula vazia faz
      // seleção em área (marquee) — o retângulo final decide quem entra na
      // seleção (ver handlePointerUp/marqueeRect).
      const additive = e.ctrlKey || e.metaKey;
      if (!additive) setSelectedIndices(new Set());
      e.currentTarget.setPointerCapture(e.pointerId);
      e.stopPropagation();
      setDrag({ mode: 'marquee', startCol: col, startRow: row, col, row, additive });
    } else {
      setSelectedIndices(new Set());
      if (!canDraw) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      e.stopPropagation();
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
          name: nextObstacleName(obstacles),
          description: '',
          sizeX: newSizeX,
          sizeY: newSizeY,
          obstacles: true,
          startPointX,
          startPointY,
          cenarioId: '',
        },
      ]);
    } else if (drag.mode === 'move') {
      if (drag.col === drag.grabCol && drag.row === drag.grabRow) {
        // Sem arrasto real (clique simples) — seleciona só esse obstáculo em
        // vez de "mover" o grupo pro mesmo lugar, senão nunca dava pra clicar
        // num obstáculo parado sem desfazer a seleção múltipla.
        setSelectedIndices(new Set([drag.grabIndex]));
      } else {
        const deltaCol = clampGroupDelta(
          drag.col - drag.grabCol,
          drag.origins.map(({ index, originX }) => ({ origin: originX, size: obstacles[index].sizeX })),
          sizeX,
        );
        const deltaRow = clampGroupDelta(
          drag.row - drag.grabRow,
          drag.origins.map(({ index, originY }) => ({ origin: originY, size: obstacles[index].sizeY })),
          sizeY,
        );
        const originByIndex = new Map(drag.origins.map((o) => [o.index, o]));

        onChange(
          obstacles.map((o, i) => {
            const origin = originByIndex.get(i);
            if (!origin) return o;
            return { ...o, startPointX: origin.originX + deltaCol, startPointY: origin.originY + deltaRow };
          }),
        );
      }
    } else {
      // marquee: seleciona todo obstáculo que intersecta o retângulo final.
      const rectStartX = Math.min(drag.startCol, drag.col);
      const rectStartY = Math.min(drag.startRow, drag.row);
      const rectEndX = Math.max(drag.startCol, drag.col);
      const rectEndY = Math.max(drag.startRow, drag.row);

      const hitIndices = obstacles.reduce<number[]>((acc, o, i) => {
        const oEndX = o.startPointX + o.sizeX - 1;
        const oEndY = o.startPointY + o.sizeY - 1;
        const intersects =
          o.startPointX <= rectEndX && oEndX >= rectStartX && o.startPointY <= rectEndY && oEndY >= rectStartY;
        if (intersects) acc.push(i);
        return acc;
      }, []);

      if (hitIndices.length > 0) {
        setSelectedIndices((prev) => {
          const next = drag.additive ? new Set(prev) : new Set<number>();
          for (const i of hitIndices) next.add(i);
          return next;
        });
      }
    }

    setDrag(null);
  }

  function cancelDrag() {
    setDrag(null);
  }

  function removeObstacle(index: number) {
    onChange(obstacles.filter((_, i) => i !== index));
    setSelectedIndices((prev) => {
      const next = new Set<number>();
      for (const i of prev) {
        if (i === index) continue;
        next.add(i > index ? i - 1 : i);
      }
      return next;
    });
  }

  function removeSelected() {
    if (selectedIndices.size === 0) return;
    onChange(obstacles.filter((_, i) => !selectedIndices.has(i)));
    setSelectedIndices(new Set());
  }

  function clearSelection() {
    setSelectedIndices(new Set());
  }

  function rectFor(obstacle: ObstaclesModel, index: number): Rect {
    if (drag?.mode === 'move') {
      const origin = drag.origins.find((entry) => entry.index === index);
      if (origin) {
        const deltaCol = clampGroupDelta(
          drag.col - drag.grabCol,
          drag.origins.map(({ index: i, originX }) => ({ origin: originX, size: obstacles[i].sizeX })),
          sizeX,
        );
        const deltaRow = clampGroupDelta(
          drag.row - drag.grabRow,
          drag.origins.map(({ index: i, originY }) => ({ origin: originY, size: obstacles[i].sizeY })),
          sizeY,
        );
        return {
          startPointX: origin.originX + deltaCol,
          startPointY: origin.originY + deltaRow,
          sizeX: obstacle.sizeX,
          sizeY: obstacle.sizeY,
        };
      }
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

  const marqueeRect: Rect | null =
    drag?.mode === 'marquee'
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
    marqueeRect,
    removeObstacle,
    removeSelected,
    selectedIndices,
    clearSelection,
    gridHandlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: cancelDrag,
    },
  };
}
