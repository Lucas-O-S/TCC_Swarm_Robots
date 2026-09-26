import type { MouseEvent } from 'react';
import { VisRobotCard } from '../VisRobotCard/VisRobotCard';
import { RobotStatus } from '../../enums/RobotStatus.enum';
import { useMapSelection } from '../../hooks/useMapElements';
import type { VisRobotRowModel } from '../../model/VisRobot.Model';
import { robotSelId } from '../../screens/Simulation/useSimSelection';
import styles from './VisRobotList.module.css';

interface VisRobotListProps {
  robots: VisRobotRowModel[];
  connected: boolean;
}

// Lista de robôs do menu do Visualizador (os que a API conhece), ligada na
// seleção do mapa como a SimRobotList da Simulação: clique seleciona e abre o
// drawer, Ctrl/Cmd+clique soma.
export function VisRobotList({ robots, connected }: VisRobotListProps) {
  const { selectedIds, toggle, selectOnly } = useMapSelection();

  function handleClick(e: MouseEvent<HTMLButtonElement>, address: string) {
    const id = robotSelId(address);
    if (e.ctrlKey || e.metaKey) toggle(id);
    else selectOnly(id);
  }

  const count = (s: RobotStatus) => robots.filter((r) => r.status === s).length;

  return (
    <div className={styles.panel}>
      <div className={styles.status}>
        <span className={`${styles.dot} ${connected ? styles.dotOn : styles.dotOff}`} />
        {connected ? 'ao vivo' : 'sem conexão'}
        <span className={styles.sep}>·</span>
        API: {count(RobotStatus.Active)} Active · {count(RobotStatus.Inactive)} Inactive · {count(RobotStatus.Lost)} Lost
      </div>

      {robots.length === 0 ? (
        <p className={styles.hint}>
          {connected
            ? 'Nenhum robô cadastrado na API ainda — eles aparecem sozinhos no primeiro DOTBOT_ADVERTISEMENT.'
            : 'Sem robôs: o visualizador só mostra os que vêm da API, e ela está sem conexão.'}
        </p>
      ) : (
        <>
          <p className={styles.hint}>Clique num robô pra ver a telemetria e mandar comandos.</p>
          <div className={styles.list}>
            {robots.map((robot) => (
              <VisRobotCard
                key={robot.address}
                robot={robot}
                selected={selectedIds.has(robotSelId(robot.address))}
                onClick={(e) => handleClick(e, robot.address)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
