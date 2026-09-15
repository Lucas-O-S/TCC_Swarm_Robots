import type { MouseEvent } from 'react';
import { MapCanvas } from '../../../components/MapCanvas/MapCanvas';
import { useMapElement } from '../../../hooks/useMapElements';
import type { MapElementsController } from '../../../hooks/useMapElements';
import type { ChargePoint, Obstacle, RobotConnection } from '../types';
import { GRID_COLS, GRID_ROWS } from '../hooks/useSwarmGrid';
import styles from './SwarmGrid.module.css';

const CELL = 32;
const ROBOT_SIZE = 12;

interface SwarmGridProps {
  robots: RobotConnection[];
  obstacles: Obstacle[];
  chargePoint: ChargePoint;
  placingCharge: boolean;
  onCellClick: (col: number, row: number) => void;
  onObstacleClick: (id: string) => void;
  /** Estado de seleção compartilhado com o resto da tela (ver DashboardScreen — a ConnectionList lê a mesma seleção). */
  elements: MapElementsController;
}

// Marcador de um robô — "deriva" da mesma entidade de seleção que o resto
// do mapa usa (ver src/hooks/useMapElements.tsx): clique seleciona,
// Ctrl/Cmd+clique soma à seleção, arrastar em área seleciona vários. Sem
// `movable` — posição de robô aqui é dado do enxame, não algo pra arrastar.
function RobotMarker({ robot }: { robot: RobotConnection }) {
  const centerX = robot.col * CELL + CELL / 2;
  const centerY = robot.row * CELL + CELL / 2;
  const { selected } = useMapElement({
    id: robot.id,
    x: centerX - ROBOT_SIZE / 2,
    y: centerY - ROBOT_SIZE / 2,
    width: ROBOT_SIZE,
    height: ROBOT_SIZE,
  });

  return (
    <button
      type="button"
      className={`${styles.robot} ${styles[robot.status]} ${selected ? styles.selected : ''}`}
      style={{ left: centerX, top: centerY }}
      title={robot.label}
    />
  );
}

// Mapa 2D do enxame em tempo real: grid quadriculado, robôs como quadrados,
// obstáculos como retângulos e o ponto de recarregamento como um marcador
// tracejado. Puramente CSS (sem canvas) — cada elemento é posicionado em
// pixels a partir da célula (col/row) que ocupa.
export function SwarmGrid({
  robots,
  obstacles,
  chargePoint,
  placingCharge,
  onCellClick,
  onObstacleClick,
  elements,
}: SwarmGridProps) {
  function handleBackgroundClick(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const col = Math.floor((e.clientX - rect.left) / CELL);
    const row = Math.floor((e.clientY - rect.top) / CELL);
    onCellClick(col, row);
  }

  return (
    <MapCanvas
      cols={GRID_COLS}
      rows={GRID_ROWS}
      cellSize={CELL}
      className={placingCharge ? styles.placing : ''}
      onClick={handleBackgroundClick}
      elements={elements}
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
        <RobotMarker key={robot.id} robot={robot} />
      ))}
    </MapCanvas>
  );
}
