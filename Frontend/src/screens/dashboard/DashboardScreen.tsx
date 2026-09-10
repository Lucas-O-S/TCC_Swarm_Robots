import { Button } from '../../components/Button/Button';
import { useSwarmGrid } from './hooks/useSwarmGrid';
import { SwarmGrid } from './components/SwarmGrid';
import { ConnectionList } from './components/ConnectionList';
import { ConnectionLog } from './components/ConnectionLog';
import type { ConnectionLogEntry } from './types';
import styles from './DashboardScreen.module.css';

// Dados de exemplo (provisórios). Trocar pelo stream real (`robot:update` /
// `robot:status` do WebSocket, ver AGENTS.md) quando existir.
const LOG_ENTRIES: ConnectionLogEntry[] = [
  { id: 'log-1', message: '⚠ R09 foi desconectado' },
  { id: 'log-2', message: '⚠ R10 foi desconectado' },
];

export function DashboardScreen() {
  const {
    robots,
    obstacles,
    chargePoint,
    selectedId,
    placingCharge,
    selectRobot,
    toggleChargePlacement,
    handleCellClick,
    addObstacle,
    removeObstacle,
    clearObstacles,
    reloadScenario,
  } = useSwarmGrid();

  const onlineCount = robots.filter((r) => r.status !== 'offline').length;

  return (
    <div className={styles.screen}>
      <div className={styles.headerRow}>
        <h2 className={styles.title}>
          Visualização do enxame — {onlineCount}/{robots.length} robôs online — tempo real
        </h2>
        <div className={styles.headerActions}>
          <Button variant={placingCharge ? 'accent' : 'outline'} onClick={toggleChargePlacement}>
            {placingCharge ? 'Clique no mapa...' : 'Definir ponto de recarregamento'}
          </Button>
          <Button variant="outline" onClick={reloadScenario}>
            Recarregar cenário
          </Button>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.mapColumn}>
          <SwarmGrid
            robots={robots}
            obstacles={obstacles}
            chargePoint={chargePoint}
            selectedId={selectedId}
            placingCharge={placingCharge}
            onSelectRobot={selectRobot}
            onCellClick={handleCellClick}
            onObstacleClick={removeObstacle}
          />

          <div className={styles.mapActions}>
            <Button variant="outline" onClick={addObstacle}>
              + Adicionar obstáculo
            </Button>
            <Button variant="outline" onClick={clearObstacles}>
              Limpar obstáculos
            </Button>
          </div>

          <p className={styles.hint}>
            Ponto de recarregamento ativo — robôs com tarefa quase concluída seguem até ele
            automaticamente.
          </p>
        </div>

        <aside className={styles.painel}>
          <ConnectionList robots={robots} selectedId={selectedId} onSelect={selectRobot} />
          <ConnectionLog entries={LOG_ENTRIES} />
        </aside>
      </div>
    </div>
  );
}
