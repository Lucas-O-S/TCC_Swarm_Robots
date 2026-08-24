import type { Robot } from '../types';
import { RobotRow } from './RobotRow';
import styles from './RobotTable.module.css';

interface RobotTableProps {
  robots: Robot[];
  onSimulateFailure: (id: string) => void;
  onMarkOutOfBounds: (id: string) => void;
  onReconnect: (id: string) => void;
}

export function RobotTable({
  robots,
  onSimulateFailure,
  onMarkOutOfBounds,
  onReconnect,
}: RobotTableProps) {
  return (
    <div className={styles.table}>
      <div className={styles.tableHeader}>
        <span>Robô</span>
        <span>Status</span>
        <span>Bateria</span>
        <span>Tarefa atual</span>
        <span>Ação</span>
      </div>

      {robots.map((robot) => (
        <RobotRow
          key={robot.id}
          robot={robot}
          onSimulateFailure={onSimulateFailure}
          onMarkOutOfBounds={onMarkOutOfBounds}
          onReconnect={onReconnect}
        />
      ))}
    </div>
  );
}
