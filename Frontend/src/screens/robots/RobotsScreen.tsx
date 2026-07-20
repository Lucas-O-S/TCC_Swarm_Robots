import { RobotTable } from './components/RobotTable';
import type { Robot } from './types';
import styles from './RobotsScreen.module.css';

// Dados de exemplo (provisórios). Trocar pela fonte real quando existir.
const robots: Robot[] = [
  { id: 0, label: 'R01', condition: 'Ativo',         battery: 90 },
  { id: 1, label: 'R02', condition: 'Ativo',         battery: 30 },
  { id: 2, label: 'R03', condition: 'Ativo',         battery: 50 },
  { id: 3, label: 'R04', condition: 'Ativo',         battery: 60 },
  { id: 4, label: 'R05', condition: 'Sem bateria',   battery: 0 },
  { id: 5, label: 'R06', condition: 'Out of Bounds', battery: null },
];

export function RobotsScreen() {
  return (
    <div className={styles.screen}>
      <div className={styles.container}>
        <RobotTable robots={robots} />
      </div>
    </div>
  );
}
