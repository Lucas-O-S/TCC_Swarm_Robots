import { ControlModeType, RobotStatus } from '../protocol/enums';
import type { ControlMode } from '../protocol/enums';
import { stepRobot } from './Robot';
import type { Obstacle, Scenario, SimRobotState, Waypoint } from './types';

type Listener = (robots: SimRobotState[]) => void;

// Núcleo da simulação: mantém o estado de todos os robôs e avança a física
// a cada tick. Sem dependência de React nem de transporte (MQTT/WS) — pode
// rodar isolado (inclusive em teste headless), como planejado no
// SIMULADOR_PLANO.md.
export class World {
  private robots = new Map<string, SimRobotState>();
  private obstacles: Obstacle[] = [];
  private readonly listeners = new Set<Listener>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private paused = false;

  loadScenario(scenario: Scenario): void {
    this.robots = new Map(
      scenario.robots.map((robot) => [
        robot.address,
        {
          address: robot.address,
          label: robot.label,
          posX: robot.x,
          posY: robot.y,
          theta: robot.theta,
          battery: robot.battery,
          mode: ControlModeType.Auto,
          status: RobotStatus.Active,
          pwmLeft: 0,
          pwmRight: 0,
          waypoints: [],
          waypointIdx: 0,
          online: true,
        } satisfies SimRobotState,
      ]),
    );
    this.obstacles = scenario.obstacles;
    this.notify();
  }

  getRobots(): SimRobotState[] {
    return Array.from(this.robots.values());
  }

  getObstacles(): Obstacle[] {
    return this.obstacles;
  }

  /** Assina snapshots do estado; chama o listener imediatamente com o estado atual. */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getRobots());
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const snapshot = this.getRobots();
    this.listeners.forEach((listener) => listener(snapshot));
  }

  start(tickHz: number): void {
    this.stop();
    const intervalMs = 1000 / tickHz;
    this.timer = setInterval(() => this.tick(intervalMs / 1000), intervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  private tick(dtSeconds: number): void {
    if (this.paused) return;
    for (const robot of this.robots.values()) {
      if (!robot.online) continue;
      stepRobot(robot, dtSeconds, this.obstacles);
    }
    this.notify();
  }

  // ---- Comandos vindos do backend (via FleetLink) --------------------------

  /** Modo MANUAL: usa só o eixo Y de cada lado do joystick como velocidade da roda. */
  applyMoveRaw(address: string, leftY: number, rightY: number): void {
    const robot = this.robots.get(address);
    if (!robot || robot.mode !== ControlModeType.Manual) return;
    robot.pwmLeft = leftY;
    robot.pwmRight = rightY;
  }

  applyControlMode(address: string, mode: ControlMode): void {
    const robot = this.robots.get(address);
    if (robot) robot.mode = mode;
  }

  applyWaypoints(address: string, waypoints: Waypoint[]): void {
    const robot = this.robots.get(address);
    if (!robot) return;
    robot.waypoints = waypoints;
    robot.waypointIdx = 0;
  }

  // ---- Interações da UI ------------------------------------------------------

  /** "Derrubar falha": simula o robô saindo do ar (para de mandar telemetria). */
  dropRobot(address: string): void {
    const robot = this.robots.get(address);
    if (!robot) return;
    robot.online = false;
    robot.status = RobotStatus.Lost;
    this.notify();
  }

  reconnectRobot(address: string): void {
    const robot = this.robots.get(address);
    if (!robot) return;
    robot.online = true;
    robot.status = RobotStatus.Active;
    this.notify();
  }

  addObstacle(obstacle: Obstacle): void {
    this.obstacles = [...this.obstacles, obstacle];
    this.notify();
  }

  clearObstacles(): void {
    this.obstacles = [];
    this.notify();
  }
}
