import styles from './RobotChip.module.css';

// Rótulo do robô (R1, R2…) na cor fixa dele — o mesmo do cartão da lista e
// do cartão Rede.
export function RobotChip({ label, color }: { label: string; color: string }) {
  return (
    <span className={styles.chip} style={{ background: color }}>
      {label}
    </span>
  );
}
