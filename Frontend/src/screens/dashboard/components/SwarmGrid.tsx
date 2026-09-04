import type { MouseEvent } from 'react';
import type { ChargePoint, Obstacle, RobotConnection } from '../types';
import { GRID_COLS, GRID_ROWS } from '../hooks/useSwarmGrid';
import styles from './SwarmGrid.module.css';

const CELL = 32;

interface SwarmGridProps {
  robots: RobotConnection[];
  obstacles: Obstacle[];
  chargePoint: ChargePoint;
  selectedId: string | null;
  placingCharge: boolean;
  onSelectRobot: (id: string | null) => void;
  onCellClick: (col: number, row: number) => void;
  onObstacleClick: (id: string) => void;
}

// Mapa 2D do enxame em tempo real: grid quadriculado, robôs como quadrados,
// obstáculos como retângulos e o ponto de recarregamento como um marcador
// tracejado. Puramente CSS (sem canvas) — cada elemento é posicionado em
// pixels a partir da célula (col/row) que ocupa.
export function SwarmGrid({
  robots,
  obstacles,
  chargePoint,
  selectedId,
  placingCharge,
  onSelectRobot,
  onCellClick,
  onObstacleClick,
}: SwarmGridProps) {
  function handleBackgroundClick(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const col = Math.floor((e.clientX - rect.left) / CELL);
    const row = Math.floor((e.clientY - rect.top) / CELL);
    onCellClick(col, row);
    onSelectRobot(null);
  }

  return (
    <div
      className={`${styles.grid} ${placingCharge ? styles.placing : ''}`}
      style={{ width: GRID_COLS * CELL, height: GRID_ROWS * CELL }}
      onClick={handleBackgroundClick}
    >
      {obstacles.map((obstacle) => (
        <div
          key={obstacle.id}
          className={styles.obstacle}
          style={{
            left: obstacle.col * CELL,
            top: obstacle.row * CELL,
            width: obstacle.width * CELL,
            height: obstacle.height * CELL,
          }}
          onClick={(e) => {
            e.stopPropagation();
            onObstacleClick(obstacle.id);
          }}
          title="Clique para remover"
        />
      ))}

      <div
        className={styles.chargePoint}
        style={{ left: chargePoint.col * CELL + CELL / 2, top: chargePoint.row * CELL + CELL / 2 }}
        title="Ponto de recarregamento"
      />

      {robots.map((robot) => (
        <button
          key={robot.id}
          type="button"
          className={`${styles.robot} ${styles[robot.status]} ${
            robot.id === selectedId ? styles.selected : ''
          }`}
          style={{ left: robot.col * CELL + CELL / 2, top: robot.row * CELL + CELL / 2 }}
          onClick={(e) => {
            e.stopPropagation();
            onSelectRobot(robot.id === selectedId ? null : robot.id);
          }}
          title={robot.label}
        />
      ))}
    </div>
  );
}
