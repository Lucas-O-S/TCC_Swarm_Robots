import { useState } from 'react';
import type { Task } from '../../../model';
import { Button } from '../../../components/Button/Button';
import styles from './TaskRow.module.css';

interface TaskRowProps {
  task: Task;
}

export function TaskRow({ task }: TaskRowProps) {
  const [count, setCount] = useState(task.robotCount);

  return (
    <div className={styles.row}>
      <div>{task.name}</div>
      <input
        type="number"
        value={count}
        onChange={(e) => setCount(Number(e.target.value))}
        className={styles.input}
      />
      <div className={styles.status}>{task.status}</div>
      <div className={styles.buttons}>
        <Button>Deploy</Button>
        <Button>Simular</Button>
      </div>
    </div>
  );
}
