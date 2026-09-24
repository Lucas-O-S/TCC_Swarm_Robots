import { CELL_MM } from '../../Consts/SimulationConsts';
import type { Vec2Model } from '../../model/SimWorld.Model';

// Ponte entre o mundo do simulador (mm, Y pra CIMA, origem no canto
// inferior-esquerdo — convenção do RobotSwarmSimulator/LH2) e o mapa do app
// (<MapCanvas>: células, px com Y pra BAIXO). Um bloco do grid do app vale
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
