import type { SimRobotState } from '../../core/types';
import { RobotTelemetryCard } from './RobotTelemetryCard';
import styles from './RobotTelemetryPanel.module.css';

interface RobotTelemetryPanelProps {
  robots: SimRobotState[];
  selectedAddress: string | null;
  onSelect: (address: string | null) => void;
  onDropFailure: (address: string) => void;
  onReconnect: (address: string) => void;
}

export function RobotTelemetryPanel({
  robots,
  selectedAddress,
  onSelect,
  onDropFailure,
  onReconnect,
}: RobotTelemetryPanelProps) {
  return (
    <div className={styles.panel}>
      <span className={styles.title}>
        {robots.filter((r) => r.online).length}/{robots.length} online
      </span>

      <div className={styles.list}>
        {robots.map((robot) => (
          <RobotTelemetryCard
            key={robot.address}
            robot={robot}
            selected={robot.address === selectedAddress}
            onSelect={() => onSelect(robot.address === selectedAddress ? null : robot.address)}
            onDropFailure={() => onDropFailure(robot.address)}
            onReconnect={() => onReconnect(robot.address)}
          />
        ))}
      </div>
    </div>
  );
}
