import styles from './BatteryBar.module.css';

interface BatteryBarProps {
  value: number | null;
}

// Barra de bateria com cor de acordo com a faixa (verde/laranja/vermelho).
// Isolada em componente próprio porque é reutilizável (RobotRow hoje, painel
// de telemetria da Simulação depois).
export function BatteryBar({ value }: BatteryBarProps) {
  if (value === null) {
    return <span className={styles.empty}>-</span>;
  }

  const level = value > 60 ? 'high' : value > 20 ? 'mid' : 'low';

  return (
    <div className={styles.wrapper}>
      <div className={styles.track}>
        <div className={`${styles.fill} ${styles[level]}`} style={{ width: `${value}%` }} />
      </div>
      <span>{value}%</span>
    </div>
  );
}
