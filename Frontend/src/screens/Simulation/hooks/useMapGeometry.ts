import { CELL_MM, POINT_SNAP_MM, RAD_TO_DEG, ROBOT_RADIUS_MM } from '../../../Consts/SimulationConsts';
import type { Vec2Model } from '../../../model/SimWorld.Model';
import { headingOf, headingVector } from '../Service/SimRobot';

// Ponte entre o mundo (mm) e o mapa do app (<MapCanvas>: células, px). Os
// dois seguem a convenção do DotBot-firmware/LH2 (ver SimRobot.ts): X pra
// direita, Y pra BAIXO, origem no canto superior-esquerdo — a mesma do grid
// do Construtor de Cenários e do de Tarefas, então mm vira px só pela escala.
// Usada pela Simulação e pelo Visualizador. Um bloco do grid do app vale
// CELL_MM (0,2 m, Consts/SimulationConsts.ts) — é a mesma escala da legenda
// "1 bloco = …" do <MapCanvas>. Funções puras (mesmo espírito do
// useTaskEditor do TaskBuilder).

export function snap(v: number, step: number): number {
  return Math.round(v / step) * step;
}

export interface MapScale {
  /** px por mm na horizontal/vertical (a célula pode não ser quadrada — MapCanvas com fitWidth + maxHeight). */
  sx: number;
  sy: number;
}

export function makeScale(cellWidth: number, cellHeight: number): MapScale {
  return { sx: cellWidth / CELL_MM, sy: cellHeight / CELL_MM };
}

/** mundo (mm) → px do mapa. */
export function toPx(s: MapScale, p: Vec2Model): Vec2Model {
  return { x: p.x * s.sx, y: p.y * s.sy };
}

/** px do mapa → mundo (mm). */
export function fromPx(s: MapScale, p: Vec2Model): Vec2Model {
  return { x: p.x / s.sx, y: p.y / s.sy };
}

/** Retângulo de célula do <MapCanvas> → AABB do mundo (mm; x,y = canto superior-esquerdo). */
export function cellRectToWorld(rect: { startPointX: number; startPointY: number; sizeX: number; sizeY: number }): {
  x: number;
  y: number;
  w: number;
  h: number;
} {
  return { x: rect.startPointX * CELL_MM, y: rect.startPointY * CELL_MM, w: rect.sizeX * CELL_MM, h: rect.sizeY * CELL_MM };
}

/** theta do mundo (rad, 0 = +Y/pra baixo, horário) → rumo do <Robot> (graus, 0° = pra cima, horário). */
export function thetaToDirection(thetaRad: number): number {
  return thetaRad * RAD_TO_DEG + 180;
}

/** Rumo no mundo → rumo na tela: com a célula esticada (sx ≠ sy), a seta aponta pra onde o robô anda NO MAPA. */
export function screenTheta(thetaRad: number, s: MapScale): number {
  const d = headingVector(thetaRad);
  return headingOf(d.x * s.sx, d.y * s.sy);
}

/** Ponto de robô/rota encaixado a cada POINT_SNAP_MM e mantido dentro da arena, a um raio de robô das bordas. */
export function clampPointToArena(p: Vec2Model, arena: { width: number; height: number }): Vec2Model {
  return {
    x: Math.max(ROBOT_RADIUS_MM, Math.min(arena.width - ROBOT_RADIUS_MM, snap(p.x, POINT_SNAP_MM))),
    y: Math.max(ROBOT_RADIUS_MM, Math.min(arena.height - ROBOT_RADIUS_MM, snap(p.y, POINT_SNAP_MM))),
  };
}

/** Canto de um retângulo de célula do <MapCanvas> → ponto do mundo (mm). */
export function cellPointToWorld(rect: { startPointX: number; startPointY: number }): Vec2Model {
  return { x: rect.startPointX * CELL_MM, y: rect.startPointY * CELL_MM };
}
