import type { Alert } from '../types';
import { Card } from '../../../components/Card/Card';
import styles from './AlertList.module.css';

interface AlertListProps {
  alerts: Alert[];
}

// Lista de alertas do sistema.
export function AlertList({ alerts }: AlertListProps) {
  return (
    <Card>
      <div className={styles.header}>
        <span>Alertas</span>
      </div>
      <ul className={styles.list}>
        {alerts.map((alerta) => (
          <li key={alerta.id} className={`${styles.alerta} ${styles[alerta.level]}`}>
            <span className={styles.timestamp}>{alerta.timestamp}</span>
            <span className={styles.msg}>{alerta.message}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
