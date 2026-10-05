import styles from './ProgressBar.module.css';

interface ProgressBarProps {
  /** Fração concluída, de 0 a 1. */
  value: number;
  title?: string;
}

// Barra fina de progresso (tarefa do robô, flash OTA).
export function ProgressBar({ value, title }: ProgressBarProps) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className={styles.track} title={title}>
      <div className={styles.bar} style={{ width: `${pct}%` }} />
    </div>
  );
}
