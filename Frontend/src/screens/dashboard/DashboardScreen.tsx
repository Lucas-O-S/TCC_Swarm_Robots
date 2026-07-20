import { useState } from 'react';
import { Card } from '../../components/Card/Card';
import { robots } from '../../data/robots';
import { alerts } from '../../data/alerts';
import { HexBackground } from './components/HexBackground';
import { SwarmMap } from './components/SwarmMap';
import { RobotList } from './components/RobotList';
import { AlertList } from './components/AlertList';
import styles from './DashboardScreen.module.css';

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
