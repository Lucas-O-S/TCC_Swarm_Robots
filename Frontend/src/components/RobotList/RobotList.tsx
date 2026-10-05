import type { MouseEvent, ReactNode } from 'react';
import { RobotCard } from '../RobotCard/RobotCard';
import type { RobotCardData } from '../RobotCard/RobotCard';
import { StatusLine } from '../StatusLine/StatusLine';
import type { StatusTone } from '../StatusLine/StatusLine';
import { useMapSelection } from '../../hooks/useMapElements';
import { robotSelId } from '../../screens/Simulation/hooks/useSimSelection';
import styles from './RobotList.module.css';

interface RobotListProps {
  /** Linha de resumo em cima (quantos na rede, status na API…). */
  summary?: ReactNode;
  summaryTone?: StatusTone;
  hint?: ReactNode;
  robots: RobotCardData[];
}

// Lista de robôs do menu (Simulação e Visualizador), ligada na seleção do
// mapa (lê e escreve a mesma seleção — ver useMapSelection e o
// <MapElementsProvider> da tela), igual à ConnectionList do Dashboard.
export function RobotList({ summary, summaryTone, hint, robots }: RobotListProps) {
  const { selectedIds, toggle, selectOnly } = useMapSelection();

  function handleClick(e: MouseEvent<HTMLButtonElement>, address: string) {
    const id = robotSelId(address);
    if (e.ctrlKey || e.metaKey) toggle(id);
    else selectOnly(id);
  }

  return (
    <div className={styles.panel}>
      {summary && <StatusLine tone={summaryTone}>{summary}</StatusLine>}
      {hint && <p className={styles.hint}>{hint}</p>}

      {robots.length > 0 && (
        <div className={styles.list}>
          {robots.map((robot) => (
            <RobotCard
              key={robot.address}
              {...robot}
              selected={selectedIds.has(robotSelId(robot.address))}
              onClick={(e) => handleClick(e, robot.address)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
