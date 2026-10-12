import { useCallback, useEffect, useState } from 'react';
import type { ScenarioModel } from '../model/Scenario.Model';
import { ScenarioService } from '../services/Scenario.Service';

export type ScenarioListState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready' }
  | { status: 'error'; message: string };

// Carrega os cenários salvos (GET /scenarios) toda vez que `enabled` vira
// true (ex.: o modal de escolher mapa abriu). Lista vazia = `ready` com
// `scenarios = []` — quem desenha decide mostrar "nenhum cenário salvo".
export function useScenarioList(enabled: boolean) {
  const [scenarios, setScenarios] = useState<ScenarioModel[]>([]);
  const [state, setState] = useState<ScenarioListState>({ status: 'idle' });

  const load = useCallback(async (isCancelled: () => boolean = () => false) => {
    setState({ status: 'loading' });
    const result = await ScenarioService.list();
    if (isCancelled()) return;

    if (!result.ok) {
      setState({ status: 'error', message: result.message });
      return;
    }
    setScenarios(result.data);
    setState({ status: 'ready' });
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void load(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [enabled, load]);

  const reload = useCallback(() => void load(), [load]);

  return { scenarios, state, reload };
}
