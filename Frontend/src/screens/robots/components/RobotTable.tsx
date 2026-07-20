import type { Robot } from '../../../model';
import { RobotRow } from './RobotRow';
import styles from './RobotTable.module.css';

interface RobotTableProps {
  robots: Robot[];
}

export function RobotTable({ robots }: RobotTableProps) {
  return (
    <div className={styles.table}>
      <div className={styles.tableHeader}>
        <span>Robô</span>
        <span>Status</span>
        <span>Bateria</span>
      </div>

      {robots.map((robot) => (
        <RobotRow key={robot.id} robot={robot} />
      ))}
    </div>
  );
}
