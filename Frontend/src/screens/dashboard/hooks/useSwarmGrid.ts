import { useCallback, useState } from 'react';
import type { ChargePoint, Obstacle } from '../types';

// Dimensões do grid do mapa (em células).
export const GRID_COLS = 14;
export const GRID_ROWS = 8;

const INITIAL_OBSTACLES: Obstacle[] = [
  { id: 'obs-1', col: 6, row: 5, width: 4, height: 2 },
];

const INITIAL_CHARGE_POINT: ChargePoint = { col: 2, row: 4 };

// Concentra o estado e as interações do mapa do enxame: seleção de robô,
// posicionamento do ponto de recarregamento e edição (simplificada) de
// obstáculos (ainda locais: não há rotas de cenário no backend). Os robôs
// vêm de `useRobotConnections`. Fica fora do componente de UI para o SwarmGrid.tsx ficar
// só com o desenho.
export function useSwarmGrid() {
  const [obstacles, setObstacles] = useState<Obstacle[]>(INITIAL_OBSTACLES);
  const [chargePoint, setChargePoint] = useState<ChargePoint>(INITIAL_CHARGE_POINT);
  const [placingCharge, setPlacingCharge] = useState(false);

  const toggleChargePlacement = useCallback(() => {
    setPlacingCharge((prev) => !prev);
  }, []);

  // Clique numa célula livre do grid: só faz algo enquanto o modo de
  // posicionar o ponto de recarregamento está ativo.
  const handleCellClick = useCallback(
    (col: number, row: number) => {
      if (!placingCharge) return;
      setChargePoint({ col, row });
      setPlacingCharge(false);
    },
    [placingCharge],
  );

  // Adiciona um obstáculo padrão (o usuário pode removê-lo clicando nele).
  // Um editor de arrastar/redimensionar completo é o próximo passo natural
  // (ver SIMULADOR_PLANO.md, seção 5.2), fora do escopo desta primeira versão.
  const addObstacle = useCallback(() => {
    setObstacles((prev) => [
      ...prev,
      {
        id: `obs-${Date.now()}`,
        col: 3 + prev.length,
        row: 6,
        width: 3,
        height: 1,
      },
    ]);
  }, []);

  const removeObstacle = useCallback((id: string) => {
    setObstacles((prev) => prev.filter((o) => o.id !== id));
  }, []);

  const clearObstacles = useCallback(() => setObstacles([]), []);

  const reloadScenario = useCallback(() => {
    setObstacles(INITIAL_OBSTACLES);
    setChargePoint(INITIAL_CHARGE_POINT);
    setPlacingCharge(false);
  }, []);

  return {
    obstacles,
    chargePoint,
    placingCharge,
    toggleChargePlacement,
    handleCellClick,
    addObstacle,
    removeObstacle,
    clearObstacles,
    reloadScenario,
  };
}