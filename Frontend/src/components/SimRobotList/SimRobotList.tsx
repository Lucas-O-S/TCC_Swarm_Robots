import type { MouseEvent } from 'react';
import { SimRobotCard } from '../SimRobotCard/SimRobotCard';
import { RobotStatus } from '../../enums/RobotStatus.enum';
import { useMapSelection } from '../../hooks/useMapElements';
import type { SimRobotRowModel } from '../../model/SimRobot.Model';
import { robotSelId } from '../../screens/Simulation/useSimSelection';
import styles from './SimRobotList.module.css';

interface SimRobotListProps {
  robots: SimRobotRowModel[];
  editing: boolean;
}

// Lista de robôs do menu lateral, sincronizada com a seleção do mapa (lê e
// escreve a mesma seleção — ver useMapSelection e o <MapElementsProvider>
// da tela Simulation), igual à ConnectionList do Dashboard.
export function SimRobotList({ robots, editing }: SimRobotListProps) {
  const { selectedIds, toggle, selectOnly } = useMapSelection();

  function handleClick(e: MouseEvent<HTMLButtonElement>, address: string) {
    const id = robotSelId(address);
    if (e.ctrlKey || e.metaKey) toggle(id);
    else selectOnly(id);
  }

  const sim = robots.filter((r) => r.sim);
  const online = sim.filter((r) => r.sim?.online).length;
  const count = (s: RobotStatus) => sim.filter((r) => r.sim?.backendStatus === s).length;

  return (
    <div className={styles.panel}>
      {editing ? (
        <p className={styles.hint}>
          {robots.length === 0
            ? 'Nenhum robô — use a ferramenta Robô no canto do mapa e clique numa célula livre.'
            : 'Clique num robô pra editar endereço, modo, bateria, rumo, LED e rota.'}
        </p>
      ) : (
        <div className={styles.status}>
          <span className={`${styles.dot} ${online === robots.length ? styles.dotOn : styles.dotWarn}`} />
          {online}/{robots.length} na rede
          <span className={styles.sep}>·</span>
          API: {count(RobotStatus.Active)} Active · {count(RobotStatus.Inactive)} Inactive · {count(RobotStatus.Lost)} Lost
        </div>
      )}

      <div className={styles.list}>
        {robots.map((robot) => (
          <SimRobotCard
            key={robot.address}
            robot={robot}
            selected={selectedIds.has(robotSelId(robot.address))}
            onClick={(e) => handleClick(e, robot.address)}
          />
        ))}
      </div>
    </div>
  );
}
