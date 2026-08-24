import type { Task } from '../types';
import { Button } from '../../../components/Button/Button';
import { formatRoute } from '../utils/formatRoute';
import styles from './TaskRow.module.css';

interface TaskRowProps {
  task: Task;
  simulating: boolean;
  onRobotCountChange: (count: number) => void;
  onDeploy: () => void;
  onSimulate: () => void;
  onCancel: () => void;
  onEditRoute: () => void;
}

const STATUS_STYLE: Record<Task['status'], string> = {
  'Na fila': styles.naFila,
  Executando: styles.executando,
  Concluída: styles.concluida,
  Cancelada: styles.cancelada,
};

export function TaskRow({
  task,
  simulating,
  onRobotCountChange,
  onDeploy,
  onSimulate,
  onCancel,
  onEditRoute,
}: TaskRowProps) {
  const isCancelled = task.status === 'Cancelada';

  return (
    <div className={styles.row}>
      <div>{task.name}</div>

      <input
        type="number"
        min={1}
        value={task.robotCount}
        onChange={(e) => onRobotCountChange(Number(e.target.value))}
        className={styles.input}
      />

      <div className={styles.local}>{formatRoute(task.route)}</div>

      <div className={styles.execucao}>
        <span className={STATUS_STYLE[task.status]}>
          {simulating ? 'Simulando' : task.status}
        </span>

        <div className={styles.buttons}>
          <Button variant="accent" onClick={onDeploy}>
            {isCancelled ? 'Replay' : 'Deploy'}
          </Button>
          <Button variant="solid" onClick={onSimulate} disabled={!task.route}>
            Simular
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={isCancelled}>
            Cancelar
          </Button>
        </div>

        <button className={styles.routeIcon} onClick={onEditRoute} title="Editar rota">
          <svg viewBox="0 0 16 16" width="14" height="14">
            <rect x="1" y="1" width="14" height="14" rx="2" fill="none" stroke="currentColor" />
            <circle cx="5" cy="11" r="1.4" fill="currentColor" />
            <circle cx="11" cy="5" r="1.4" fill="currentColor" />
            <path d="M5 11 11 5" stroke="currentColor" />
          </svg>
        </button>
      </div>
    </div>
  );
}
