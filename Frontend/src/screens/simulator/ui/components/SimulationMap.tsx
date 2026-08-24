import { useEffect, useRef } from 'react';
import type { Arena, Obstacle, SimRobotState } from '../../core/types';
import styles from './SimulationMap.module.css';

interface SimulationMapProps {
  arena: Arena;
  robots: SimRobotState[];
  obstacles: Obstacle[];
  selectedAddress: string | null;
  onSelect: (address: string | null) => void;
}

const VIEW_PX = 520;
const TRAIL_LENGTH = 50;

// Paleta simples e determinística por endereço, só pra diferenciar os
// rastros de cada robô no mapa (não tem significado além disso).
const TRAIL_COLORS = ['#2f6fed', '#1a9e45', '#c0392b', '#b8860b', '#8e44ad', '#16a085'];

function colorFor(address: string): string {
  const sum = address.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return TRAIL_COLORS[sum % TRAIL_COLORS.length];
}

// Mapa 2D (topo) da simulação: robôs, obstáculos e o rastro recente de cada
// robô. Escala o espaço em milímetros do World para pixels da tela.
export function SimulationMap({ arena, robots, obstacles, selectedAddress, onSelect }: SimulationMapProps) {
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
    <div
      className={styles.map}
      style={{ width: VIEW_PX, height: heightPx }}
      onClick={() => onSelect(null)}
    >
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
        <button
          key={robot.address}
          type="button"
          className={`${styles.robot} ${robot.online ? styles.online : styles.offline} ${
            robot.address === selectedAddress ? styles.selected : ''
          }`}
          style={{
            left: robot.posX * scale,
            top: robot.posY * scale,
            transform: `translate(-50%, -50%) rotate(${robot.theta}deg)`,
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(robot.address === selectedAddress ? null : robot.address);
          }}
          title={robot.label}
        />
      ))}
    </div>
  );
}
