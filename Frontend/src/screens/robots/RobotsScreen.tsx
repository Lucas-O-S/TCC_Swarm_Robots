import { robots } from '../../data/robots';
import { RobotTable } from './components/RobotTable';
import styles from './RobotsScreen.module.css';

export function RobotsScreen() {
  return (
    <div className={styles.screen}>
      <div className={styles.container}>
        <RobotTable robots={robots} />
      </div>
    </div>
  );
}
