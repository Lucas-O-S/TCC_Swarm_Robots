import type { MouseEvent } from 'react';
import type { RobotConnection } from '../types';
import { StatusHex } from '../../../components/StatusHex/StatusHex';
import { useMapSelection } from '../../../hooks/useMapElements';
import styles from './ConnectionList.module.css';

interface ConnectionListProps {
  robots: RobotConnection[];
}

// Tabela simples "Robô | Conexão", sincronizada com a seleção no mapa — lê e
// escreve a mesma seleção que o próprio <SwarmGrid> usa (ver useMapSelection),
// então clicar aqui ou no mapa dá o mesmo resultado (inclusive Ctrl/Cmd+clique
// pra somar à seleção). Precisa ser passado via <MapCanvas panel={...}> (ver
// DashboardScreen.tsx) pra enxergar o contexto.
export function ConnectionList({ robots }: ConnectionListProps) {
  const { selectedIds, toggle, selectOnly } = useMapSelection();

  function handleRowClick(e: MouseEvent<HTMLDivElement>, id: string) {
    if (e.ctrlKey || e.metaKey) toggle(id);
    else selectOnly(id);
  }

  return (
    <div className={styles.list}>
      <div className={styles.header}>
        <span>Robô</span>
        <span>Conexão</span>
      </div>

      {robots.map((robot) => (
        <div
          key={robot.id}
          className={`${styles.row} ${selectedIds.has(robot.id) ? styles.highlight : ''}`}
          onClick={(e) => handleRowClick(e, robot.id)}
        >
          <span>{robot.label}</span>
          <StatusHex online={robot.status !== 'offline'} />
        </div>
      ))}
    </div>
  );
}
