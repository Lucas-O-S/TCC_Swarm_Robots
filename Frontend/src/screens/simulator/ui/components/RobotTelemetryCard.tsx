import type { SimRobotState } from '../../core/types';
import { ControlModeType } from '../../protocol/enums';
import { Button } from '../../../components/Button/Button';
import styles from './RobotTelemetryCard.module.css';

interface RobotTelemetryCardProps {
  robot: SimRobotState;
  selected: boolean;
  onSelect: () => void;
  onDropFailure: () => void;
  onReconnect: () => void;
}

const MODE_LABEL: Record<number, string> = {
  [ControlModeType.Auto]: 'AUTO',
  [ControlModeType.Manual]: 'MANUAL',
  [ControlModeType.SemiAuto]: 'SEMI-AUTO',
};

// Cartão de telemetria de um robô simulado — mesmo conjunto de campos do
// RobotSwarmSimulator de referência (posição, theta, modo, bateria, pwm das
// rodas, índice do waypoint atual).
export function RobotTelemetryCard({
  robot,
  selected,
  onSelect,
  onDropFailure,
  onReconnect,
}: RobotTelemetryCardProps) {
  return (
    <div className={`${styles.card} ${selected ? styles.selected : ''}`} onClick={onSelect}>
      <div className={styles.header}>
        <span className={styles.address}>{robot.label}</span>
        <span className={robot.online ? styles.online : styles.offline}>
          {robot.online ? 'ONLINE' : 'OFFLINE'}
        </span>
      </div>

      <dl className={styles.fields}>
        <div>
          <dt>pos (mm)</dt>
          <dd>
            x={robot.posX.toFixed(0)} y={robot.posY.toFixed(0)}
          </dd>
        </div>
        <div>
          <dt>theta</dt>
          <dd>{robot.theta.toFixed(1)}°</dd>
        </div>
        <div>
          <dt>modo</dt>
          <dd>{MODE_LABEL[robot.mode]}</dd>
        </div>
        <div>
          <dt>bateria</dt>
          <dd>{robot.battery.toFixed(1)}%</dd>
        </div>
        <div>
          <dt>pwm L/R</dt>
          <dd>
            {robot.pwmLeft.toFixed(0)} / {robot.pwmRight.toFixed(0)}
          </dd>
        </div>
        <div>
          <dt>wp_idx</dt>
          <dd>
            {robot.waypointIdx}/{robot.waypoints.length}
          </dd>
        </div>
      </dl>

      <div className={styles.footer}>
        {robot.online ? (
          <Button
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onDropFailure();
            }}
          >
            Derrubar falha
          </Button>
        ) : (
          <Button
            variant="solid"
            onClick={(e) => {
              e.stopPropagation();
              onReconnect();
            }}
          >
            Reconectar
          </Button>
        )}
      </div>
    </div>
  );
}
