import type { Robot } from '../types';
import { useSwarmMap } from '../hooks/useSwarmMap';
import styles from './SwarmMap.module.css';

interface SwarmMapProps {
  robots: Robot[];
  hoveredId: number | null;
  onHover: (id: number | null) => void;
}

// Mapa do enxame desenhado em <canvas>, com tooltip do robô destacado.
export function SwarmMap({ robots, hoveredId, onHover }: SwarmMapProps) {
  const { canvasRef, hitTest, tooltipPos, width, height } = useSwarmMap(
    robots,
    hoveredId,
  );

  const hovered = robots.find((r) => r.id === hoveredId) ?? null;
  const pos = hovered ? tooltipPos(hovered) : { left: 0, top: 0 };

  return (
    <div className={styles.canvasContainer}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={styles.canvas}
        style={{ cursor: hoveredId !== null ? 'pointer' : 'default' }}
        onMouseMove={(e) => {
          const found = hitTest(e);
          onHover(found ? found.id : null);
        }}
        onMouseLeave={() => onHover(null)}
      />

      {hovered && (
        <div
          className={`${styles.tooltip} ${styles.visible}`}
          style={{ left: pos.left, top: pos.top }}
        >
          <strong>Robô:</strong> {hovered.label}
          <br />
          <strong>Status:</strong> {hovered.status}
          <br />
          <strong>Tarefa:</strong> {hovered.tarefa}
        </div>
      )}
    </div>
  );
}
