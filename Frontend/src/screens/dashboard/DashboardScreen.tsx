import { useState } from 'react';
import { Card } from '../../components/Card/Card';
import { HexBackground } from './components/HexBackground';
import { SwarmMap } from './components/SwarmMap';
import { RobotList } from './components/RobotList';
import { AlertList } from './components/AlertList';
import type { Robot, Alert } from './types';
import styles from './DashboardScreen.module.css';

// Dados de exemplo (provisórios). Trocar pela fonte real quando existir.
const robots: Robot[] = [
  { id: 0, label: 'R01', col: 2,  row: 1, online: true,  status: 'Operacional',  tarefa: 'Coletando ferramentas' },
  { id: 1, label: 'R02', col: 3,  row: 2, online: true,  status: 'Operacional',  tarefa: 'Mapeando área B' },
  { id: 2, label: 'R03', col: 5,  row: 4, online: true,  status: 'Retornando',   tarefa: 'Recarga de bateria' },
  { id: 3, label: 'R04', col: 10, row: 9, online: true,  status: 'Aguardando',   tarefa: 'Nenhuma' },
  { id: 4, label: 'R05', col: 7,  row: 6, online: false, status: 'Desconectado', tarefa: 'Desconhecida' },
  { id: 5, label: 'R06', col: 9,  row: 3, online: false, status: 'Desconectado', tarefa: 'Desconhecida' },
];

const alerts: Alert[] = [
  { id: 0, timestamp: '[25/05 20:42]', message: 'R05 foi desconectado', level: 'critico' },
  { id: 1, timestamp: '[25/05 20:43]', message: 'R06 foi desconectado', level: 'critico' },
];

export function DashboardScreen() {
  // Estado compartilhado: robô destacado no mapa e na lista.
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  return (
    <div className={styles.screen}>
      <HexBackground />

      <div className={styles.container}>
        <main>
          <Card>
            <h2 className={styles.mapaTitle}>Mapa do Enxame</h2>
            <SwarmMap robots={robots} hoveredId={hoveredId} onHover={setHoveredId} />
          </Card>
        </main>

        <aside className={styles.painel}>
          <RobotList robots={robots} hoveredId={hoveredId} onHover={setHoveredId} />
          <AlertList alerts={alerts} />
        </aside>
      </div>
    </div>
  );
}
