import type { RobotConnection } from '../types';
import { StatusHex } from '../../../components/StatusHex/StatusHex';
import styles from './ConnectionList.module.css';

interface ConnectionListProps {
  robots: RobotConnection[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

// Tabela simples "Robô | Conexão", sincronizada com a seleção no mapa.
export function ConnectionList({ robots, selectedId, onSelect }: ConnectionListProps) {
  return (
    <div className={styles.list}>
      <div className={styles.header}>
        <span>Robô</span>
        <span>Conexão</span>
      </div>

      {robots.map((robot) => (
        <div
          key={robot.id}
          className={`${styles.row} ${robot.id === selectedId ? styles.highlight : ''}`}
          onClick={() => onSelect(robot.id === selectedId ? null : robot.id)}
        >
          <span>{robot.label}</span>
          <StatusHex online={robot.status !== 'offline'} />
        </div>
      ))}
    </div>
  );
}
