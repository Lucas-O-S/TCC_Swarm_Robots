import { DEFAULT_WAYPOINT_THRESHOLD_MM } from '../../Consts/SimulationConsts';
import { DotBotControlMode } from '../../enums/DotBotControlMode.enum';
import { RobotApplication } from '../../enums/RobotApplication.enum';
import type { ScenarioModel, ScenarioObstacleModel, ScenarioRobotModel } from '../../model/Scenario.Model';
import type { Vec2Model } from '../../model/SimWorld.Model';

// Operações PURAS do modo Editar sobre o cenário JSON (mesmo papel do
// useObstacleEditor do CenarioBuilder e do useTaskEditor do TaskBuilder) —
// porte do RobotSwarmSimulator (src/ui/editorModel.ts), só que endereçadas por
// id/address (a seleção do mapa do app é por id estável, ver
// src/hooks/useMapElements.tsx) em vez de índice. Toda função devolve um
// cenário NOVO.

/** Address hex de 16 chars (mesmo formato do VARCHAR(16) do backend), único em `existing`. */
export function generateAddress(existing: Iterable<string>, rand: () => number = Math.random): string {
  const taken = new Set(Array.from(existing, (a) => a.toUpperCase()));
  const HEX = '0123456789ABCDEF';
  for (;;) {
    let addr = '';
    for (let i = 0; i < 16; i++) addr += HEX[Math.floor(rand() * 16) % 16];
    if (!taken.has(addr)) return addr;
  }
}

/** Próximo id livre no padrão "barreira-N" (olha o maior N, não a quantidade). */
export function uniqueObstacleId(existing: readonly string[]): string {
  const taken = new Set(existing);
  for (let n = 1; ; n++) {
    const id = `barreira-${n}`;
    if (!taken.has(id)) return id;
  }
}

export function makeObstacle(s: ScenarioModel, rect: { x: number; y: number; w: number; h: number }): ScenarioObstacleModel {
  return {
    id: uniqueObstacleId(s.obstacles.map((o) => o.id)),
    x_mm: rect.x,
    y_mm: rect.y,
    w_mm: rect.w,
    h_mm: rect.h,
  };
}

export function makeRobot(s: ScenarioModel, pos: Vec2Model): ScenarioRobotModel {
  return {
    address: generateAddress(s.robots.map((r) => r.address)),
    application: RobotApplication.DotBot,
    mode: DotBotControlMode.Manual,
    start: { x_mm: pos.x, y_mm: pos.y, theta_deg: 90 }, // "olhando pro norte"
    battery: 100,
  };
}

export function addObstacle(s: ScenarioModel, o: ScenarioObstacleModel): ScenarioModel {
  return { ...s, obstacles: [...s.obstacles, o] };
}

export function addRobot(s: ScenarioModel, r: ScenarioRobotModel): ScenarioModel {
  return { ...s, robots: [...s.robots, r] };
}

export function removeObstacle(s: ScenarioModel, id: string): ScenarioModel {
  return { ...s, obstacles: s.obstacles.filter((o) => o.id !== id) };
}

export function removeRobot(s: ScenarioModel, address: string): ScenarioModel {
  return { ...s, robots: s.robots.filter((r) => r.address !== address) };
}

export function patchObstacle(s: ScenarioModel, id: string, patch: Partial<ScenarioObstacleModel>): ScenarioModel {
  return { ...s, obstacles: s.obstacles.map((o) => (o.id === id ? { ...o, ...patch } : o)) };
}

export function patchRobot(s: ScenarioModel, address: string, patch: Partial<ScenarioRobotModel>): ScenarioModel {
  return { ...s, robots: s.robots.map((r) => (r.address === address ? { ...r, ...patch } : r)) };
}

export function setRobotStart(s: ScenarioModel, address: string, start: Partial<ScenarioRobotModel['start']>): ScenarioModel {
  const cur = s.robots.find((r) => r.address === address);
  if (!cur) return s;
  return patchRobot(s, address, { start: { ...cur.start, ...start } });
}

/** Acrescenta um waypoint à rota — espelha o efeito do LH2_WAYPOINTS: ganhar rota põe o robô em AUTO. */
export function addRobotWaypoint(s: ScenarioModel, address: string, p: Vec2Model): ScenarioModel {
  const cur = s.robots.find((r) => r.address === address);
  if (!cur) return s;
  return patchRobot(s, address, {
    mode: DotBotControlMode.Auto,
    waypoints: [...(cur.waypoints ?? []), { x_mm: p.x, y_mm: p.y }],
    waypoint_threshold_mm: cur.waypoint_threshold_mm ?? DEFAULT_WAYPOINT_THRESHOLD_MM,
  });
}

export function moveRobotWaypoint(s: ScenarioModel, address: string, index: number, p: Vec2Model): ScenarioModel {
  const cur = s.robots.find((r) => r.address === address);
  if (!cur) return s;
  return patchRobot(s, address, {
    waypoints: (cur.waypoints ?? []).map((wp, i) => (i === index ? { x_mm: p.x, y_mm: p.y } : wp)),
  });
}

export function removeRobotWaypoint(s: ScenarioModel, address: string, index: number): ScenarioModel {
  const cur = s.robots.find((r) => r.address === address);
  if (!cur) return s;
  return patchRobot(s, address, { waypoints: (cur.waypoints ?? []).filter((_, i) => i !== index) });
}
