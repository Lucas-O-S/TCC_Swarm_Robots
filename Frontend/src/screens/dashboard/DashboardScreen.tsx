import { Button } from '../../components/Button/Button';
import { MapElementsProvider, useMapElementsState } from '../../hooks/useMapElements';
import { useSwarmGrid } from './hooks/useSwarmGrid';
import { SwarmGrid } from './components/SwarmGrid';
import { ConnectionList } from './components/ConnectionList';
import { ConnectionLog } from './components/ConnectionLog';
import { useRobotConnections } from './hooks/useRobotConnections';
import { toConnectionLog } from './robotConnections';
import styles from './DashboardScreen.module.css';

export function DashboardScreen() {
  const { robots, state, retry } = useRobotConnections();
  const {
    obstacles,
    chargePoint,
    placingCharge,
    toggleChargePlacement,
    handleCellClick,
    addObstacle,
    removeObstacle,
    clearObstacles,
    reloadScenario,
  } = useSwarmGrid();

  // Criado aqui (não dentro do <SwarmGrid>) porque a ConnectionList — uma
  // lista normal no layout da tela, não um drawer flutuante — também
  // precisa ler/escrever a mesma seleção (ver useMapSelection). Envolvendo
  // os dois no mesmo Provider, ambos enxergam o mesmo estado.
  const mapElements = useMapElementsState();

  const onlineCount = robots.filter((r) => r.status !== 'offline').length;

  return (
    <MapElementsProvider value={mapElements.contextValue}>
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

        {state.status === 'loading' && <p className={styles.hint}>Carregando robôs...</p>}
        {state.status === 'error' && (
          <p className={styles.hint} role="alert">
            {state.message}{' '}
            <Button variant="outline" onClick={retry}>
              Tentar de novo
            </Button>
          </p>
        )}
        {state.status === 'ready' && robots.length === 0 && (
          <p className={styles.hint}>Nenhum robô cadastrado ainda.</p>
        )}

        <div className={styles.body}>
          <div className={styles.mapColumn}>
            <SwarmGrid
              robots={robots}
              obstacles={obstacles}
              chargePoint={chargePoint}
              placingCharge={placingCharge}
              onCellClick={handleCellClick}
              onObstacleClick={removeObstacle}
              elements={mapElements}
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
            <ConnectionList robots={robots} />
            <ConnectionLog entries={toConnectionLog(robots)} />
          </aside>
        </div>
      </div>
    </MapElementsProvider>
  );
}