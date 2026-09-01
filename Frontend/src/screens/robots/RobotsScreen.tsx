import { RobotTable } from './components/RobotTable';
import { useRobots } from './hooks/useRobots';
import styles from './RobotsScreen.module.css';

export function RobotsScreen() {
  const { robots, loading, error, deletingIds, deleteRobot } = useRobots();

  return (
    <div className={styles.screen}>
      <h2 className={styles.title}>Status individual da frota</h2>

      {error && <p role="alert">Não foi possível carregar os robôs: {error}</p>}
      {loading ? (
        <p>Carregando robôs...</p>
      ) : (
        <RobotTable robots={robots} deletingIds={deletingIds} onDelete={deleteRobot} />
      )}
    </div>
  );
}
