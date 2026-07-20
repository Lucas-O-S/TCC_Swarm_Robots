import type { Task } from '../types';
import { TaskRow } from './TaskRow';
import styles from './TaskTable.module.css';

interface TaskTableProps {
  tasks: Task[];
}

export function TaskTable({ tasks }: TaskTableProps) {
  return (
    <>
      <div className={styles.header}>
        <span>Tarefa</span>
        <span>Qtd Robôs</span>
        <span>Execução</span>
      </div>

      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} />
      ))}
    </>
  );
}
