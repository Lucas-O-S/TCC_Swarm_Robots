import { useCallback, useState } from 'react';
import type { ChargePoint, Obstacle, RobotConnection } from '../types';

// Dimensões do grid do mapa (em células).
export const GRID_COLS = 14;
export const GRID_ROWS = 8;

const INITIAL_ROBOTS: RobotConnection[] = [
  { id: 'R01', label: 'R01', col: 2, row: 1, status: 'online' },
  { id: 'R02', label: 'R02', col: 5, row: 1, status: 'online' },
  { id: 'R03', label: 'R03', col: 7, row: 1, status: 'online' },
  { id: 'R04', label: 'R04', col: 4, row: 2, status: 'online' },
  { id: 'R05', label: 'R05', col: 6, row: 3, status: 'online' },
  { id: 'R06', label: 'R06', col: 9, row: 2, status: 'online' },
  { id: 'R07', label: 'R07', col: 12, row: 3, status: 'online' },
  { id: 'R08', label: 'R08', col: 2, row: 5, status: 'selecionado' },
  { id: 'R09', label: 'R09', col: 3, row: 4, status: 'offline' },
  { id: 'R10', label: 'R10', col: 8, row: 5, status: 'offline' },
];

const INITIAL_OBSTACLES: Obstacle[] = [
  { id: 'obs-1', col: 6, row: 5, width: 4, height: 2 },
];

const INITIAL_CHARGE_POINT: ChargePoint = { col: 2, row: 4 };

// Concentra o estado e as interações do mapa do enxame: seleção de robô,
// posicionamento do ponto de recarregamento e edição (simplificada) de
// obstáculos. Fica fora do componente de UI para o SwarmGrid.tsx ficar
// só com o desenho.
export function useSwarmGrid() {
  const [robots] = useState<RobotConnection[]>(INITIAL_ROBOTS);
  const [obstacles, setObstacles] = useState<Obstacle[]>(INITIAL_OBSTACLES);
  const [chargePoint, setChargePoint] = useState<ChargePoint>(INITIAL_CHARGE_POINT);
  const [selectedId, setSelectedId] = useState<string | null>('R08');
  const [placingCharge, setPlacingCharge] = useState(false);

  const selectRobot = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

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
    setSelectedId(null);
    setPlacingCharge(false);
  }, []);

  return {
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
  };
}
