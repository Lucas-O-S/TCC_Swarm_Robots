import type { ScenarioListState } from '../../hooks/useScenarioList';
import type { ScenarioModel } from '../../model/Scenario.Model';
import { Button } from '../Button/Button';
import styles from './SavedScenarioList.module.css';

interface SavedScenarioListProps {
  scenarios: ScenarioModel[];
  state: ScenarioListState;
  onSelect: (scenario: ScenarioModel) => void;
  onRetry: () => void;
  /** Texto quando não há nenhum cenário salvo. */
  emptyMessage?: string;
}

// Lista de cenários salvos com os 3 estados que a API pode devolver:
// carregando, erro (com "tentar de novo") e vazio — usada pelos dois modais
// de escolher mapa (construtor de cenários e construtor de tasks).
export function SavedScenarioList({
  scenarios,
  state,
  onSelect,
  onRetry,
  emptyMessage = 'Nenhum cenário salvo ainda.',
}: SavedScenarioListProps) {
  if (state.status === 'idle' || state.status === 'loading') {
    return <p className={styles.message}>Carregando cenários...</p>;
  }

  if (state.status === 'error') {
    return (
      <div role="alert">
        <p className={styles.error}>{state.message}</p>
        <Button variant="outline" onClick={onRetry}>
          Tentar de novo
        </Button>
      </div>
    );
  }

  if (scenarios.length === 0) {
    return <p className={styles.message}>{emptyMessage}</p>;
  }

  return (
    <ul className={styles.list}>
      {scenarios.map((scenario) => (
        <li key={scenario.uuid ?? scenario.name} className={styles.item}>
          <span className={styles.info}>
            <strong>{scenario.name}</strong>
            <span className={styles.meta}>
              {scenario.sizeX}×{scenario.sizeY} · {scenario.obstacles.length} obstáculo(s)
            </span>
          </span>
          <Button variant="outline" onClick={() => onSelect(scenario)}>
            Selecionar
          </Button>
        </li>
      ))}
    </ul>
  );
}