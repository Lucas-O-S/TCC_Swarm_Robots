import { useState } from 'react';
import type { MouseEvent } from 'react';
import type { GridPoint, RouteMode, TaskRoute } from '../types';
import styles from './RouteEditor.module.css';

const CELL = 26;
const COLS = 16;
const ROWS = 8;

interface RouteEditorProps {
  value: TaskRoute;
  onChange: (route: TaskRoute) => void;
}

function toCell(e: MouseEvent<HTMLDivElement>): GridPoint {
  const rect = e.currentTarget.getBoundingClientRect();
  return {
    col: Math.max(0, Math.min(COLS, Math.round((e.clientX - rect.left) / CELL))),
    row: Math.max(0, Math.min(ROWS, Math.round((e.clientY - rect.top) / CELL))),
  };
}

// Grid clicável para desenhar a rota/área de uma tarefa. Reaproveitado tanto
// pelo formulário de criação (AddTaskForm) quanto pelo modal de edição
// (RouteModal) — o valor e as mudanças ficam nas mãos de quem o usa.
//
// Modo "rota": cada clique adiciona um ponto na sequência.
// Modo "área": clique + arrastar define um retângulo (2 cantos opostos).
export function RouteEditor({ value, onChange }: RouteEditorProps) {
  const [dragStart, setDragStart] = useState<GridPoint | null>(null);

  function setMode(mode: RouteMode) {
    onChange({ mode, points: [] });
  }

  function handleClick(e: MouseEvent<HTMLDivElement>) {
    if (value.mode !== 'rota') return;
    onChange({ ...value, points: [...value.points, toCell(e)] });
  }

  function handleMouseDown(e: MouseEvent<HTMLDivElement>) {
    if (value.mode !== 'area') return;
    setDragStart(toCell(e));
  }

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (value.mode !== 'area' || !dragStart) return;
    onChange({ mode: 'area', points: [dragStart, toCell(e)] });
  }

  function handleMouseUp() {
    setDragStart(null);
  }

  function resetSelection() {
    onChange({ ...value, points: [] });
  }

  const rectStyle =
    value.mode === 'area' && value.points.length === 2
      ? {
          left: Math.min(value.points[0].col, value.points[1].col) * CELL,
          top: Math.min(value.points[0].row, value.points[1].row) * CELL,
          width: Math.abs(value.points[1].col - value.points[0].col) * CELL,
          height: Math.abs(value.points[1].row - value.points[0].row) * CELL,
        }
      : null;

  return (
    <div className={styles.wrapper}>
      <div className={styles.modeRow}>
        <label>
          <input
            type="radio"
            checked={value.mode === 'rota'}
            onChange={() => setMode('rota')}
          />
          Rota específica
        </label>
        <label>
          <input
            type="radio"
            checked={value.mode === 'area'}
            onChange={() => setMode('area')}
          />
          Área
        </label>
        <button type="button" className={styles.resetBtn} onClick={resetSelection}>
          Reiniciar seleção
        </button>
      </div>

      <div
        className={styles.grid}
        style={{ width: COLS * CELL, height: ROWS * CELL }}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {value.mode === 'rota' && value.points.length > 0 && (
          <svg className={styles.overlay} width={COLS * CELL} height={ROWS * CELL}>
            <polyline
              points={value.points.map((p) => `${p.col * CELL},${p.row * CELL}`).join(' ')}
              fill="none"
              stroke="var(--color-dark)"
              strokeWidth={1.5}
            />
            {value.points.map((p, i) => (
              <circle key={i} cx={p.col * CELL} cy={p.row * CELL} r={4} fill="var(--color-dark)" />
            ))}
          </svg>
        )}

        {rectStyle && <div className={styles.rect} style={rectStyle} />}
      </div>

      <p className={styles.hint}>
        {value.mode === 'rota'
          ? `${value.points.length} ponto(s) na rota — clique para adicionar mais.`
          : 'Clique e arraste para selecionar uma região.'}
      </p>
    </div>
  );
}
