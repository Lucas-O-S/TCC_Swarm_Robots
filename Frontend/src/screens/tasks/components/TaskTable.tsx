import type { Task } from '../types';
import { TaskRow } from './TaskRow';
import styles from './TaskTable.module.css';

interface TaskTableProps {
  tasks: Task[];
  simulatingIds: Set<string>;
  onRobotCountChange: (id: string, count: number) => void;
  onDeploy: (id: string) => void;
  onSimulate: (id: string) => void;
  onCancel: (id: string) => void;
  onEditRoute: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TaskTable({
  tasks,
  simulatingIds,
  onRobotCountChange,
  onDeploy,
  onSimulate,
  onCancel,
  onEditRoute,
  onDelete,
}: TaskTableProps) {
  return (
    <div>
      <div className={styles.header}>
        <span>Tarefa</span>
        <span>Qtd Robôs</span>
        <span>Local</span>
        <span>Execução</span>
      </div>

      {tasks.length === 0 && <p>Nenhuma tarefa cadastrada.</p>}

      {tasks.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          simulating={simulatingIds.has(task.id)}
          onRobotCountChange={(count) => onRobotCountChange(task.id, count)}
          onDeploy={() => onDeploy(task.id)}
          onSimulate={() => onSimulate(task.id)}
          onCancel={() => onCancel(task.id)}
          onEditRoute={() => onEditRoute(task.id)}
          onDelete={() => onDelete(task.id)}
        />
      ))}
    </div>
  );
}
