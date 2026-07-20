import { tasks } from '../../data/tasks';
import { TaskTable } from './components/TaskTable';
import { AddTaskButton } from './components/AddTaskButton';
import styles from './TasksScreen.module.css';

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
