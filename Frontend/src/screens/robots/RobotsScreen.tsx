import { useState } from 'react';
import { RobotTable } from './components/RobotTable';
import type { Robot } from './types';
import styles from './RobotsScreen.module.css';

// Dados de exemplo (provisórios). Trocar pela fonte real (GET /robots +
// `robot:update` do WebSocket) quando existir.
const INITIAL_ROBOTS: Robot[] = [
  { id: 'R01', label: 'R01', condition: 'Ativo', battery: 88, task: '-' },
  { id: 'R02', label: 'R02', condition: 'Ativo', battery: 86, task: '-' },
  { id: 'R03', label: 'R03', condition: 'Ativo', battery: 74, task: '-' },
  { id: 'R04', label: 'R04', condition: 'Ativo', battery: 67, task: '-' },
  { id: 'R05', label: 'R05', condition: 'Ativo', battery: 53, task: '-' },
  { id: 'R06', label: 'R06', condition: 'Ativo', battery: 45, task: '-' },
  { id: 'R07', label: 'R07', condition: 'Ativo', battery: 32, task: '-' },
  { id: 'R08', label: 'R08', condition: 'Carregando', battery: 24, task: '-' },
  { id: 'R09', label: 'R09', condition: 'Sem bateria', battery: 8, task: '-' },
  { id: 'R10', label: 'R10', condition: 'Out of Bounds', battery: null, task: '-' },
];

export function RobotsScreen() {
  const [robots, setRobots] = useState<Robot[]>(INITIAL_ROBOTS);

  // TODO: trocar pelas chamadas reais quando as rotas do RobotController
  // estiverem ligadas no front (PUT /robots/:address/control-mode etc.).
  function handleSimulateFailure(id: string) {
    setRobots((prev) =>
      prev.map((r) => (r.id === id ? { ...r, condition: 'Out of Bounds', battery: null } : r)),
    );
  }

  function handleMarkOutOfBounds(id: string) {
    setRobots((prev) =>
      prev.map((r) => (r.id === id ? { ...r, condition: 'Out of Bounds' } : r)),
    );
  }

  function handleReconnect(id: string) {
    setRobots((prev) =>
      prev.map((r) => (r.id === id ? { ...r, condition: 'Ativo', battery: r.battery ?? 100 } : r)),
    );
  }

  return (
    <div className={styles.screen}>
      <h2 className={styles.title}>Status individual da frota</h2>
      <RobotTable
        robots={robots}
        onSimulateFailure={handleSimulateFailure}
        onMarkOutOfBounds={handleMarkOutOfBounds}
        onReconnect={handleReconnect}
      />
    </div>
  );
}
