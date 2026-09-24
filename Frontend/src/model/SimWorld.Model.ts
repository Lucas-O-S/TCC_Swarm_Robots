/**
 * Mundo da simulação em memória (ver `screens/Simulation/SimWorld.ts`) —
 * mm com Y pra cima, origem no canto inferior-esquerdo.
 */

export interface Vec2Model {
  x: number;
  y: number;
}

/** Arena, em mm. `grid` é só informativo — a tela usa o bloco padrão do app (ver `SimulationConsts.CELL_MM`). */
export interface SimArenaModel {
  width: number;
  height: number;
  grid: number;
}

/** Barreira retangular alinhada aos eixos (AABB), em mm — x,y = canto inferior-esquerdo. */
export interface SimObstacleModel {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}
