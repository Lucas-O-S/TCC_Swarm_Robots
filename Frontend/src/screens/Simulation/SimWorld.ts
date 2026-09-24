import { ROBOT_RADIUS_MM } from '../../Consts/SimulationConsts';
import { DotBotControlMode } from '../../enums/DotBotControlMode.enum';
import type { NetworkConfigModel, SimConfigModel } from '../../model/Scenario.Model';
import type { SimArenaModel, SimObstacleModel } from '../../model/SimWorld.Model';
import type { SimRobot } from './SimRobot';
import { applyWaypointController } from './SimWaypoints';
import { resolveMovement, separateRobots } from './SimPhysics';

export interface SimWorldInit {
  arena: SimArenaModel;
  network: NetworkConfigModel;
  sim: SimConfigModel;
  obstacles?: SimObstacleModel[];
  robots?: SimRobot[];
}

// Mundo da simulação — porte do RobotSwarmSimulator (src/core/World.ts):
// arena + obstáculos + robôs + relógio de ticks FIXOS (1/tick_hz). Sem
// React e sem transporte: roda igual num teste headless.
export class SimWorld {
  arena: SimArenaModel;
  network: NetworkConfigModel;
  sim: SimConfigModel;
  obstacles: SimObstacleModel[];
  robots: SimRobot[];

  /** Tempo simulado acumulado, em segundos. */
  time = 0;

  constructor(init: SimWorldInit) {
    this.arena = { ...init.arena };
    this.network = { ...init.network };
    this.sim = { ...init.sim };
    this.obstacles = (init.obstacles ?? []).map((o) => ({ ...o }));
    this.robots = init.robots ?? [];
  }

  get tickDt(): number {
    return 1 / this.sim.tick_hz;
  }

  addRobot(robot: SimRobot): void {
    this.robots.push(robot);
  }

  getRobot(address: string): SimRobot | undefined {
    return this.robots.find((r) => r.address === address);
  }

  /** Um passo: controlador AUTO → integração → colisão com obstáculos/bordas → separação robô × robô. */
  tick(dt: number = this.tickDt): void {
    for (const robot of this.robots) {
      if (robot.mode === DotBotControlMode.Auto) applyWaypointController(robot);

      const prev = { x: robot.pos_x, y: robot.pos_y };
      robot.step(dt, this.sim.battery_drain_per_min);

      const resolved = resolveMovement(prev, { x: robot.pos_x, y: robot.pos_y }, ROBOT_RADIUS_MM, this.obstacles, this.arena);
      robot.pos_x = resolved.x;
      robot.pos_y = resolved.y;
    }

    // Todos os robôs ocupam espaço no chão, inclusive os offline.
    const bodies = this.robots.map((r) => ({ x: r.pos_x, y: r.pos_y }));
    separateRobots(bodies, ROBOT_RADIUS_MM, this.obstacles, this.arena);
    this.robots.forEach((r, i) => {
      r.pos_x = bodies[i].x;
      r.pos_y = bodies[i].y;
    });

    this.time += dt;
  }
}
