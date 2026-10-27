import { useCallback, useEffect, useState } from 'react';
import { PositionService } from '../../../services/Position.Service';
import { RobotService } from '../../../services/Robot.Service';
import { toRobotConnections } from '../robotConnections';
import type { RobotConnection } from '../types';
import { GRID_COLS, GRID_ROWS } from './useSwarmGrid';

const REFRESH_MS = 5000;

export type RobotsLoadState =
  | { status: 'loading' }
  | { status: 'ready' }
  | { status: 'error'; message: string };

// Busca robôs + posições na API (via services/repositories) e repete a cada
// 5 s. "Lista vazia" é `ready` com `robots = []` — a tela decide o que mostrar.
// Se uma atualização falhar, os últimos dados continuam na tela e o erro aparece.
export function useRobotConnections() {
  const [robots, setRobots] = useState<RobotConnection[]>([]);
  const [state, setState] = useState<RobotsLoadState>({ status: 'loading' });

  const load = useCallback(async (isCancelled: () => boolean = () => false) => {
    const [robotsResult, positionsResult] = await Promise.all([
      RobotService.list(),
      PositionService.list(),
    ]);
    if (isCancelled()) return;

    if (!robotsResult.ok) {
      setState({ status: 'error', message: robotsResult.message });
      return;
    }
    // Sem posições o mapa só fica sem marcadores: não é motivo pra esconder a lista.
    const positions = positionsResult.ok ? positionsResult.data : [];
    setRobots(toRobotConnections(robotsResult.data, positions, GRID_COLS, GRID_ROWS));
    setState(positionsResult.ok ? { status: 'ready' } : { status: 'error', message: positionsResult.message });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const isCancelled = () => cancelled;
    void load(isCancelled);
    const timer = setInterval(() => void load(isCancelled), REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [load]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    void load();
  }, [load]);

  return { robots, state, retry };
}