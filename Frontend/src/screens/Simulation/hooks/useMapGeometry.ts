import { CELL_MM, POINT_SNAP_MM, ROBOT_RADIUS_MM } from '../../../Consts/SimulationConsts';
import type { Vec2Model } from '../../../model/SimWorld.Model';

// Ponte entre o mundo do simulador (mm, Y pra CIMA, origem no canto
// inferior-esquerdo — convenção do RobotSwarmSimulator/LH2) e o mapa do app
// (<MapCanvas>: células, px com Y pra BAIXO). Usada pela Simulação e pelo
// Visualizador. Um bloco do grid do app vale
// CELL_MM (0,2 m, Consts/SimulationConsts.ts) — é a mesma escala da legenda
// "1 bloco = …" do <MapCanvas>, então o mapa da simulação conversa com o do
// Construtor de Cenários e o do de Tarefas. Funções puras (mesmo espírito do
// useTaskEditor do TaskBuilder).

export function snap(v: number, step: number): number {
  return Math.round(v / step) * step;
}

export interface MapScale {
  /** px por mm na horizontal/vertical (a célula pode não ser quadrada — MapCanvas com fitWidth + maxHeight). */
  sx: number;
  sy: number;
  /** Altura da arena em mm (pra inverter o Y). */
  heightMm: number;
}

export function makeScale(cellWidth: number, cellHeight: number, heightMm: number): MapScale {
  return { sx: cellWidth / CELL_MM, sy: cellHeight / CELL_MM, heightMm };
}

/** mundo (mm) → px do mapa. */
export function toPx(s: MapScale, p: Vec2Model): Vec2Model {
  return { x: p.x * s.sx, y: (s.heightMm - p.y) * s.sy };
}

/** px do mapa → mundo (mm). */
export function fromPx(s: MapScale, p: Vec2Model): Vec2Model {
  return { x: p.x / s.sx, y: s.heightMm - p.y / s.sy };
}

/** Retângulo de célula do <MapCanvas> (canto sup.-esq., Y pra baixo) → AABB do mundo (canto inf.-esq., Y pra cima). */
export function cellRectToWorld(
  rect: { startPointX: number; startPointY: number; sizeX: number; sizeY: number },
  heightMm: number,
): { x: number; y: number; w: number; h: number } {
  const w = rect.sizeX * CELL_MM;
  const h = rect.sizeY * CELL_MM;
  return { x: rect.startPointX * CELL_MM, y: heightMm - rect.startPointY * CELL_MM - h, w, h };
}

/** theta do mundo (rad, anti-horário a partir de +X) → rumo do <Robot> (graus, 0° = pra cima, horário). */
export function thetaToDirection(thetaRad: number): number {
  return 90 - (thetaRad * 180) / Math.PI;
}

/** Rumo no mundo → rumo na tela: com a célula esticada (sx ≠ sy), a seta aponta pra onde o robô anda NO MAPA. */
export function screenTheta(thetaRad: number, s: MapScale): number {
  return Math.atan2(Math.sin(thetaRad) * s.sy, Math.cos(thetaRad) * s.sx);
}

/** Ponto de robô/rota encaixado a cada POINT_SNAP_MM e mantido dentro da arena, a um raio de robô das bordas. */
export function clampPointToArena(p: Vec2Model, arena: { width: number; height: number }): Vec2Model {
  return {
    x: Math.max(ROBOT_RADIUS_MM, Math.min(arena.width - ROBOT_RADIUS_MM, snap(p.x, POINT_SNAP_MM))),
    y: Math.max(ROBOT_RADIUS_MM, Math.min(arena.height - ROBOT_RADIUS_MM, snap(p.y, POINT_SNAP_MM))),
  };
}

/** Canto de um retângulo de célula do <MapCanvas> (Y pra baixo) → ponto do mundo (mm, Y pra cima). */
export function cellPointToWorld(rect: { startPointX: number; startPointY: number }, heightMm: number): Vec2Model {
  return { x: rect.startPointX * CELL_MM, y: heightMm - rect.startPointY * CELL_MM };
}
