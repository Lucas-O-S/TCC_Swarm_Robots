import type { TaskWaypointModel } from '../../model/Task.Model';
import styles from './RobotPath.module.css';

interface RobotPathProps {
  points: TaskWaypointModel[];
  cellSize: number;
  color?: string;
  className?: string;
}

// Rota planejada do robô (TaskModel.waypoints, src/model/Task.Model.ts)
// desenhada sobre o <Map>: um ponto por parada (<circle>) ligado por uma
// linha tracejada (<polyline>). x/y do TaskWaypointModel são célula do grid
// (mesma convenção de ObstaclesModel.startPointX/Y), não mm — por isso usam
// cellSize igual <Obstacle>/<Robot>. É um overlay do tamanho do mapa
// inteiro, por isso não recebe left/top como os outros — quem posiciona
// cada ponto é a lista `points`, não quem usa o componente.
export function RobotPath({ points, cellSize, color = 'var(--color-orange)', className = '' }: RobotPathProps) {
  if (points.length === 0) return null;

  const ordered = [...points].sort((a, b) => a.orderIndex - b.orderIndex);
  const pixelPoints = ordered.map((p) => ({
    x: p.x * cellSize + cellSize / 2,
    y: p.y * cellSize + cellSize / 2,
  }));

  return (
    <svg className={`${styles.path} ${className}`}>
      {pixelPoints.length > 1 && (
        <polyline
          points={pixelPoints.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeDasharray="4 3"
        />
      )}
      {pixelPoints.map((p, index) => (
        <g key={index}>
          <circle cx={p.x} cy={p.y} r={7} fill={color} />
          <text
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={8}
            fontFamily="var(--font-mono)"
            fontWeight={600}
            fill="#fff"
          >
            {index + 1}
          </text>
        </g>
      ))}
    </svg>
  );
}
