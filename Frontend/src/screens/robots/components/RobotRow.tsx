import type { Robot } from '../types';
import styles from './RobotRow.module.css';

interface RobotRowProps {
  robot: Robot;
}

export function RobotRow({ robot }: RobotRowProps) {
  return (
    <div className={styles.row}>
      <span>{robot.label}</span>
      <span>{robot.condition}</span>
      <span>{robot.battery === null ? '-' : `${robot.battery}%`}</span>
    </div>
  );
}
