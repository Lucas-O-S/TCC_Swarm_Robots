import styles from './AddTaskButton.module.css';

interface AddTaskButtonProps {
  onClick: () => void;
}

export function AddTaskButton({ onClick }: AddTaskButtonProps) {
  return (
    <button className={styles.addBtn} onClick={onClick} aria-label="Adicionar tarefa">
      +
    </button>
  );
}
