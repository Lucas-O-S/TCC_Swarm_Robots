import type { Robot } from '../types';
import { Button } from '../../../components/Button/Button';
import { BatteryBar } from './BatteryBar';
import styles from './RobotRow.module.css';

interface RobotRowProps {
  robot: Robot;
  onSimulateFailure: (id: string) => void;
  onMarkOutOfBounds: (id: string) => void;
  onReconnect: (id: string) => void;
}

const CONDITION_STYLE: Record<Robot['condition'], string> = {
  Ativo: styles.ativo,
  Carregando: styles.carregando,
  'Sem bateria': styles.critico,
  'Out of Bounds': styles.critico,
};

export function RobotRow({ robot, onSimulateFailure, onMarkOutOfBounds, onReconnect }: RobotRowProps) {
  const isDown = robot.condition === 'Sem bateria' || robot.condition === 'Out of Bounds';

  return (
    <div className={styles.row}>
      <span>{robot.label}</span>
      <span className={CONDITION_STYLE[robot.condition]}>{robot.condition}</span>
      <BatteryBar value={robot.battery} />
      <span className={styles.task}>{robot.task}</span>

      <div className={styles.actions}>
        {isDown ? (
          <Button variant="outline" onClick={() => onReconnect(robot.id)}>
            Reconectar
          </Button>
        ) : (
          <>
            <Button variant="solid" onClick={() => onSimulateFailure(robot.id)}>
              Simular falha
            </Button>
            <Button variant="outline" onClick={() => onMarkOutOfBounds(robot.id)}>
              Out of Bounds
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
