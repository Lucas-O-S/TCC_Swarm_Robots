import type { SimRobotState } from '../../core/types';
import { useMapSelection } from '../../../../hooks/useMapElements';
import { RobotTelemetryCard } from './RobotTelemetryCard';
import styles from './RobotTelemetryPanel.module.css';

interface RobotTelemetryPanelProps {
  robots: SimRobotState[];
  onDropFailure: (address: string) => void;
  onReconnect: (address: string) => void;
}

// Lê e escreve a mesma seleção que o próprio <SimulationMap> usa (ver
// useMapSelection) — precisa ser passado via <MapElementsProvider> em
// comum com o mapa (ver SimulationScreen.tsx), não como um painel isolado.
export function RobotTelemetryPanel({ robots, onDropFailure, onReconnect }: RobotTelemetryPanelProps) {
  const { selectedIds, selectOnly, clear } = useMapSelection();

  function handleSelect(address: string) {
    const isOnlyOneSelected = selectedIds.size === 1 && selectedIds.has(address);
    if (isOnlyOneSelected) clear();
    else selectOnly(address);
  }

  return (
    <div className={styles.panel}>
      <span className={styles.title}>
        {robots.filter((r) => r.online).length}/{robots.length} online
      </span>

      <div className={styles.list}>
        {robots.map((robot) => (
          <RobotTelemetryCard
            key={robot.address}
            robot={robot}
            selected={selectedIds.has(robot.address)}
            onSelect={() => handleSelect(robot.address)}
            onDropFailure={() => onDropFailure(robot.address)}
            onReconnect={() => onReconnect(robot.address)}
          />
        ))}
      </div>
    </div>
  );
}
