import type { Robot } from '../types';
import { Card } from '../../../components/Card/Card';
import { StatusHex } from '../../../components/StatusHex/StatusHex';
import styles from './RobotList.module.css';

interface RobotListProps {
  robots: Robot[];
  hoveredId: number | null;
  onHover: (id: number | null) => void;
}

// Lista lateral de robôs, sincronizada com o destaque do mapa.
export function RobotList({ robots, hoveredId, onHover }: RobotListProps) {
  return (
    <Card className={styles.listaRobos}>
      <div className={styles.header}>
        <span>Robô</span>
        <span>Conexão</span>
      </div>

      {robots.map((robot) => (
        <div
          key={robot.id}
          className={`${styles.item} ${robot.id === hoveredId ? styles.highlight : ''}`}
          onMouseEnter={() => onHover(robot.id)}
          onMouseLeave={() => onHover(null)}
        >
          <span>{robot.label}</span>
          <StatusHex online={robot.online} />
        </div>
      ))}
    </Card>
  );
}
