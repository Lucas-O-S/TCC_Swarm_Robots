import type { Robot } from '../types';
import { RobotRow } from './RobotRow';
import styles from './RobotTable.module.css';

interface RobotTableProps {
  robots: Robot[];
  deletingIds: Set<string>;
  onDelete: (id: string) => void;
}

export function RobotTable({ robots, deletingIds, onDelete }: RobotTableProps) {
  return (
    <div className={styles.table}>
      <div className={styles.tableHeader}>
        <span>Robô</span>
        <span>Status</span>
        <span>Bateria</span>
        <span>Tarefa atual</span>
        <span>Ação</span>
      </div>

      {robots.length === 0 && <p>Nenhum robô cadastrado.</p>}

      {robots.map((robot) => (
        <RobotRow
          key={robot.id}
          robot={robot}
          deleting={deletingIds.has(robot.id)}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
