import type { MapModel } from '../model/Map.Model';
import type { ScenarioModel, ScenarioRobotModel } from '../model/Scenario.Model';
import type { DotBotControlMode } from '../enums/DotBotControlMode.enum';
import type { RobotApplication } from '../enums/RobotApplication.enum';
import { ADDRESS_RE, CELL_MM, DEFAULT_NETWORK, DEFAULT_SIM_CONFIG, DEFAULT_WAYPOINT_THRESHOLD_MM, DEG_TO_RAD, RAD_TO_DEG } from '../Consts/SimulationConsts';
import { SimRobot } from '../screens/Simulation/SimRobot';
import { SimWorld } from '../screens/Simulation/SimWorld';

// Conversões do cenário da Simulação (mesmo papel dos outros *.Mapper.ts:
// traduzir de um formato pro outro, sem regra de tela):
//   - toWorld/fromWorld: cenário JSON (mm/graus, schema do RobotSwarmSimulator)
//     ⇄ SimWorld em memória (mm/radianos) — porte do src/core/scenario.ts de lá;
//   - fromMap: mapa do app (MapModel em células, Y pra baixo — CenarioBuilder)
//     → cenário (mm, Y pra cima).

function fail(msg: string): never {
  throw new Error(`Cenário inválido: ${msg}`);
}

/** Cenário (JSON) → SimWorld pronto pra simular. Valida o mínimo necessário (mesma validação do RobotSwarmSimulator). */
function toWorld(json: ScenarioModel | string): SimWorld {
  const s: ScenarioModel = typeof json === 'string' ? JSON.parse(json) : json;

  if (s.version !== 1) fail(`version esperada 1, recebida ${s.version}`);
  if (!s.arena || s.arena.width_mm <= 0 || s.arena.height_mm <= 0) fail('arena.width_mm/height_mm devem ser positivos');
  if (!s.sim || s.sim.tick_hz <= 0) fail('sim.tick_hz deve ser positivo');
  if (!s.network?.id) fail('network.id ausente');
  if (!Array.isArray(s.robots)) fail('robots deve ser uma lista');
  if (!Array.isArray(s.obstacles)) fail('obstacles deve ser uma lista');

  const world = new SimWorld({
    arena: { width: s.arena.width_mm, height: s.arena.height_mm, grid: s.arena.grid_mm },
    network: { id: s.network.id, gateway_addr: s.network.gateway_addr },
    sim: { ...s.sim },
    obstacles: s.obstacles.map((o) => ({ id: o.id, x: o.x_mm, y: o.y_mm, w: o.w_mm, h: o.h_mm })),
  });

  const seen = new Set<string>();
  for (const r of s.robots) {
    if (!ADDRESS_RE.test(r.address)) fail(`address "${r.address}" deve ter 16 dígitos hex`);
    const address = r.address.toUpperCase();
    if (seen.has(address)) fail(`address "${address}" repetido`);
    seen.add(address);

    const robot = new SimRobot({
      address,
      application: r.application as RobotApplication,
      mode: r.mode as DotBotControlMode,
      x: r.start.x_mm,
      y: r.start.y_mm,
      theta: r.start.theta_deg * DEG_TO_RAD,
      battery: r.battery,
    });

    // waypoints opcionais — atribuídos direto (sem setWaypoints) pra NÃO
    // forçar AUTO: o `mode` persistido é respeitado.
    if (r.waypoints !== undefined) {
      if (!Array.isArray(r.waypoints)) fail(`robots["${address}"].waypoints deve ser uma lista`);
      for (const wp of r.waypoints) {
        if (typeof wp?.x_mm !== 'number' || typeof wp?.y_mm !== 'number') {
          fail(`robots["${address}"].waypoints[*] precisa de x_mm/y_mm numéricos`);
        }
      }
      robot.waypoints = r.waypoints.map((wp) => ({ x: wp.x_mm, y: wp.y_mm }));
      robot.waypoint_threshold = r.waypoint_threshold_mm ?? DEFAULT_WAYPOINT_THRESHOLD_MM;
    }

    if (r.loop !== undefined) {
      if (typeof r.loop !== 'boolean') fail(`robots["${address}"].loop deve ser boolean`);
      robot.loop = r.loop;
    }

    if (r.rgb !== undefined) {
      const { r: red, g, b } = r.rgb;
      const ok = [red, g, b].every((v) => typeof v === 'number' && v >= 0 && v <= 255);
      if (!ok) fail(`robots["${address}"].rgb deve ter r/g/b em 0..255`);
      robot.setRgb(red, g, b);
    }

    world.addRobot(robot);
  }

  return world;
}

/** SimWorld → cenário (JSON) — a pose ATUAL vira o `start` ("Exportar estado"). */
function fromWorld(world: SimWorld): ScenarioModel {
  return {
    version: 1,
    network: { ...world.network },
    arena: { width_mm: world.arena.width, height_mm: world.arena.height, grid_mm: world.arena.grid },
    obstacles: world.obstacles.map((o) => ({ id: o.id, x_mm: o.x, y_mm: o.y, w_mm: o.w, h_mm: o.h })),
    robots: world.robots.map((r) => {
      const out: ScenarioRobotModel = {
        address: r.address,
        application: r.application,
        mode: r.mode,
        start: { x_mm: Math.round(r.pos_x), y_mm: Math.round(r.pos_y), theta_deg: Math.round(r.theta * RAD_TO_DEG * 10) / 10 },
        battery: Math.round(r.battery * 10) / 10,
      };
      if (r.waypoints.length > 0) {
        out.waypoints = r.waypoints.map((wp) => ({ x_mm: wp.x, y_mm: wp.y }));
        out.waypoint_threshold_mm = r.waypoint_threshold;
        if (r.loop) out.loop = true;
      }
      if (r.rgb.r !== 0 || r.rgb.g !== 0 || r.rgb.b !== 0) out.rgb = { ...r.rgb };
      return out;
    }),
    sim: { ...world.sim },
  };
}

/** Mapa do app (células, Y pra baixo — ver CenarioBuilder) → cenário do simulador (mm, Y pra cima). */
function fromMap(map: MapModel, robots: ScenarioRobotModel[] = []): ScenarioModel {
  const { cenario } = map;
  const width = cenario.sizeX * CELL_MM;
  const height = cenario.sizeY * CELL_MM;

  return {
    version: 1,
    network: { ...DEFAULT_NETWORK },
    arena: { width_mm: width, height_mm: height, grid_mm: CELL_MM },
    obstacles: cenario.Obstacles.map((o) => ({
      id: o.name || o.id,
      x_mm: o.startPointX * CELL_MM,
      y_mm: height - (o.startPointY + o.sizeY) * CELL_MM,
      w_mm: o.sizeX * CELL_MM,
      h_mm: o.sizeY * CELL_MM,
    })),
    robots: robots.map((r) => ({ ...r, start: { ...r.start }, waypoints: r.waypoints?.map((w) => ({ ...w })) })),
    sim: { ...DEFAULT_SIM_CONFIG },
  };
}

/** Cópia profunda (o cenário é JSON puro). */
function clone(s: ScenarioModel): ScenarioModel {
  return JSON.parse(JSON.stringify(s)) as ScenarioModel;
}

export const ScenarioMapper = {
  toWorld,
  fromWorld,
  fromMap,
  clone,
};
