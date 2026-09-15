import { useEffect, useRef } from 'react';
import { MapCanvas } from '../../../../components/MapCanvas/MapCanvas';
import { useMapElement } from '../../../../hooks/useMapElements';
import type { MapElementsController } from '../../../../hooks/useMapElements';
import type { Arena, Obstacle, SimRobotState } from '../../core/types';
import styles from './SimulationMap.module.css';

interface SimulationMapProps {
  arena: Arena;
  robots: SimRobotState[];
  obstacles: Obstacle[];
  /** Estado de seleção compartilhado com o resto da tela (ver SimulationScreen — o RobotTelemetryPanel lê a mesma seleção). */
  elements: MapElementsController;
}

const VIEW_PX = 520;
const TRAIL_LENGTH = 50;
const ROBOT_SIZE = 14;

// Paleta simples e determinística por endereço, só pra diferenciar os
// rastros de cada robô no mapa (não tem significado além disso).
const TRAIL_COLORS = ['#2f6fed', '#1a9e45', '#c0392b', '#b8860b', '#8e44ad', '#16a085'];

function colorFor(address: string): string {
  const sum = address.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return TRAIL_COLORS[sum % TRAIL_COLORS.length];
}

// Marcador de um robô — "deriva" da mesma entidade de seleção que o resto
// do mapa usa (ver src/hooks/useMapElements.tsx): clique seleciona,
// Ctrl/Cmd+clique soma à seleção, arrastar em área seleciona vários. Sem
// `movable` — posição vem da física simulada, não é algo pra arrastar.
function RobotMarker({ robot, scale }: { robot: SimRobotState; scale: number }) {
  const centerX = robot.posX * scale;
  const centerY = robot.posY * scale;
  const { selected } = useMapElement({
    id: robot.address,
    x: centerX - ROBOT_SIZE / 2,
    y: centerY - ROBOT_SIZE / 2,
    width: ROBOT_SIZE,
    height: ROBOT_SIZE,
  });

  return (
    <button
      type="button"
      className={`${styles.robot} ${robot.online ? styles.online : styles.offline} ${selected ? styles.selected : ''}`}
      style={{
        left: centerX,
        top: centerY,
        transform: `translate(-50%, -50%) rotate(${robot.theta}deg)`,
      }}
      title={robot.label}
    />
  );
}

// Mapa 2D (topo) da simulação: robôs, obstáculos e o rastro recente de cada
// robô. Escala o espaço em milímetros do World para pixels da tela.
export function SimulationMap({ arena, robots, obstacles, elements }: SimulationMapProps) {
  const trails = useRef<Map<string, { x: number; y: number }[]>>(new Map());
  const scale = VIEW_PX / Math.max(arena.widthMm, arena.heightMm);
  const heightPx = arena.heightMm * scale;

  useEffect(() => {
    for (const robot of robots) {
      const history = trails.current.get(robot.address) ?? [];
      history.push({ x: robot.posX, y: robot.posY });
      if (history.length > TRAIL_LENGTH) history.shift();
      trails.current.set(robot.address, history);
    }
  }, [robots]);

  return (
    <MapCanvas cols={VIEW_PX / 26} rows={heightPx / 26} cellSize={26} className={styles.map} elements={elements}>
      <svg className={styles.trails} width={VIEW_PX} height={heightPx}>
        {robots.map((robot) => {
          const history = trails.current.get(robot.address) ?? [];
          if (history.length < 2) return null;
          return (
            <polyline
              key={robot.address}
              points={history.map((p) => `${p.x * scale},${p.y * scale}`).join(' ')}
              fill="none"
              stroke={colorFor(robot.address)}
              strokeWidth={1}
              opacity={0.5}
            />
          );
        })}
      </svg>

      {obstacles.map((obstacle) => (
        <div
          key={obstacle.id}
          className={styles.obstacle}
          style={{
            left: obstacle.x * scale,
            top: obstacle.y * scale,
            width: obstacle.w * scale,
            height: obstacle.h * scale,
          }}
        />
      ))}

      {robots.map((robot) => (
        <RobotMarker key={robot.address} robot={robot} scale={scale} />
      ))}
    </MapCanvas>
  );
}
