import type { TaskWaypointModel } from '../../model/Task.Model';
import styles from './RobotPath.module.css';

interface RobotPathProps {
  points: TaskWaypointModel[];
  cellSize: number;
  /** Altura da célula (px) quando ela não é quadrada (MapCanvas com `fitWidth` + `maxHeight`) — default `cellSize`. */
  cellHeight?: number;
  color?: string;
  className?: string;
  /** Fecha a linha de volta pro primeiro ponto — mesma rota, só que virando um bloco/área em vez de um trajeto aberto. Default false. */
  closed?: boolean;
  /**
   * "dashed" (default): linha tracejada + círculo numerado em cada ponto.
   * "arrows": linha sólida com contorno claro por baixo e uma seta de
   * direção no meio de cada trecho, sem os círculos — pra telas que já
   * desenham marcadores próprios nos pontos (ex.: TaskBuilder) e onde a
   * linha precisa continuar legível passando por cima de outras camadas
   * (ex.: área de um bloco).
   */
  variant?: 'dashed' | 'arrows';
}

/** Trecho mais curto (px) que ainda ganha seta — abaixo disso a seta cobriria a linha inteira. */
const MIN_ARROW_SEGMENT = 28;

// Rota planejada do robô (TaskModel.waypoints, src/model/Task.Model.ts)
// desenhada sobre o <Map>: um ponto por parada (<circle>) ligado por uma
// linha tracejada (<polyline>). x/y do TaskWaypointModel são célula do grid
// (mesma convenção de ObstaclesModel.startPointX/Y), não mm — por isso usam
// cellSize igual <Obstacle>/<Robot>. É um overlay do tamanho do mapa
// inteiro, por isso não recebe left/top como os outros — quem posiciona
// cada ponto é a lista `points`, não quem usa o componente.
export function RobotPath({
  points,
  cellSize,
  cellHeight = cellSize,
  color = 'var(--color-orange)',
  className = '',
  closed = false,
  variant = 'dashed',
}: RobotPathProps) {
  if (points.length === 0) return null;

  const ordered = [...points].sort((a, b) => a.orderIndex - b.orderIndex);
  const pixelPoints = ordered.map((p) => ({
    x: p.x * cellSize + cellSize / 2,
    y: p.y * cellHeight + cellHeight / 2,
  }));
  const linePoints = closed && pixelPoints.length > 1 ? [...pixelPoints, pixelPoints[0]] : pixelPoints;
  const polylinePoints = linePoints.map((p) => `${p.x},${p.y}`).join(' ');

  if (variant === 'arrows') {
    const arrows = linePoints.slice(1).flatMap((to, index) => {
      const from = linePoints[index];
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      if (Math.hypot(dx, dy) < MIN_ARROW_SEGMENT) return [];
      return [{ x: (from.x + to.x) / 2, y: (from.y + to.y) / 2, angle: (Math.atan2(dy, dx) * 180) / Math.PI }];
    });

    return (
      <svg className={`${styles.path} ${className}`}>
        {linePoints.length > 1 && (
          <>
            <polyline
              points={polylinePoints}
              fill="none"
              stroke="var(--color-surface)"
              strokeWidth={6}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <polyline
              points={polylinePoints}
              fill="none"
              stroke={color}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </>
        )}
        {arrows.map((a, index) => (
          <path
            key={index}
            d="M -5 -4.5 L 5 0 L -5 4.5 Z"
            transform={`translate(${a.x} ${a.y}) rotate(${a.angle})`}
            fill={color}
            stroke="var(--color-surface)"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        ))}
      </svg>
    );
  }

  return (
    <svg className={`${styles.path} ${className}`}>
      {pixelPoints.length > 1 && (
        <polyline
          points={polylinePoints}
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
