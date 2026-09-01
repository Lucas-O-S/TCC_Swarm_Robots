import type { Robot } from '../types';
import { Button } from '../../../components/Button/Button';
import { BatteryBar } from './BatteryBar';
import styles from './RobotRow.module.css';

interface RobotRowProps {
  robot: Robot;
  deleting: boolean;
  onDelete: (id: string) => void;
}

const CONDITION_STYLE: Record<Robot['condition'], string> = {
  Ativo: styles.ativo,
  Inativo: styles.carregando,
  Perdido: styles.critico,
};

// Os botões de simulação/mock ("Simular falha", "Out of Bounds",
// "Reconectar") foram removidos ao ligar na API real: eles mexiam num
// campo `condition` só local, sem nada por trás. `status` agora vem do
// backend (calculado a partir de `lastSync`, ver `useRobots.ts`) e não é
// algo que a API aceite gravar — a única ação de CRUD real que faz
// sentido aqui é excluir o robô.
export function RobotRow({ robot, deleting, onDelete }: RobotRowProps) {
  return (
    <div className={styles.row}>
      <span>{robot.label}</span>
      <span className={CONDITION_STYLE[robot.condition]}>{robot.condition}</span>
      <BatteryBar value={robot.battery} />
      <span className={styles.task}>{robot.task}</span>

      <div className={styles.actions}>
        <Button
          variant="outline"
          onClick={() => {
            if (window.confirm(`Excluir o robô "${robot.label}"? Essa ação não pode ser desfeita.`)) {
              onDelete(robot.id);
            }
          }}
          disabled={deleting}
        >
          {deleting ? 'Excluindo...' : 'Excluir'}
        </Button>
      </div>
    </div>
  );
}
