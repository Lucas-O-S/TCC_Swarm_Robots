import { TaskTable } from './components/TaskTable';
import { AddTaskButton } from './components/AddTaskButton';
import type { Task } from './types';
import styles from './TasksScreen.module.css';

// Dados de exemplo (provisórios). Trocar pela fonte real quando existir.
const tasks: Task[] = [
  { id: 0, name: 'Limpar setor 1', robotCount: 20, status: 'Em progresso' },
];

export function TasksScreen() {
  return (
    <div className={styles.screen}>
      <div className={styles.container}>
        <TaskTable tasks={tasks} />
        <AddTaskButton />
      </div>
    </div>
  );
}
