import { RobotStatus } from '../../enums/RobotStatus.enum';
import type { LinkLogEntry } from '../../Integration/LocalFleetLink';
import { SimRobotMapper } from '../../mapper/SimRobot.Mapper';
import { VisRobotMapper } from '../../mapper/VisRobot.Mapper';
import type { RobotModel } from '../../model/Robot.Model';
import type { RobotTelemetryModel } from '../../model/RobotTelemetry.Model';
import type { Vec2Model } from '../../model/SimWorld.Model';
import type { TaskModel } from '../../model/Task.Model';
import type { VisRobotModel } from '../../model/VisRobot.Model';

const TRAIL_MAX_POINTS = 400;
const TRAIL_MIN_DIST_MM = 8;
const LOG_MAX = 150;
/** Quantas linhas pra trás procurar uma do mesmo fluxo (comando e erro se alternam). */
const STREAM_LOOKBACK = 4;

/** O backend grava o address em hex minúsculo; a chave interna ignora a caixa pra casar REST e socket. */
const keyOf = (address: string) => address.toLowerCase();

/** Fluxo do joystick (CMD_MOVE_RAW a 20 Hz) vira uma linha só, com contador — mesma regra do log do LocalFleetLink. */
function streamKey(text: string): string | undefined {
  if (!text.includes('CMD_MOVE_RAW')) return undefined;
  return text.replace(/L=-?\d+ R=-?\d+/, 'L=# R=#');
}

function newEntry(robot: RobotModel): VisRobotModel {
  return { robot, telemetry: null, receivedAt: null, theta: 0, rgb: null, route: null };
}

// A frota como a API mostra, fora do React — o papel do SimWorld +
// LocalFleetLink na Simulação, mas sem nada simulado: o registro de cada
// robô (API), a última telemetria, o rastro recente, as tarefas e o log.
// Quem alimenta é o useVisualizer (eventos e respostas do ApiLink); cada
// mudança chama `onChange`, e o hook agenda um render.
export class VisFleet {
  /** Na ordem em que os robôs apareceram: os rótulos R1, R2… não mudam quando a lista recarrega. */
  private robotMap = new Map<string, VisRobotModel>();
  private taskList: TaskModel[] = [];
  /** Chave = address como a API manda (é o que o SimulationMap procura). */
  private trailMap = new Map<string, Vec2Model[]>();
  private logEntries: LinkLogEntry[] = [];
  private logSeq = 0;
  private startedAt = Date.now();
  private readonly onChange: () => void;

  constructor(onChange: () => void) {
    this.onChange = onChange;
  }

  // ---- Leitura (tela) -----------------------------------------------------------

  get robots(): VisRobotModel[] {
    return [...this.robotMap.values()];
  }

  get tasks(): readonly TaskModel[] {
    return this.taskList;
  }

  get trails(): ReadonlyMap<string, readonly Vec2Model[]> {
    return this.trailMap;
  }

  /** Log (mais recente primeiro), no formato do GatewayLog; `t` = segundos desde que a tela abriu. */
  get entries(): readonly LinkLogEntry[] {
    return this.logEntries;
  }

  get(address: string): VisRobotModel | null {
    return this.robotMap.get(keyOf(address)) ?? null;
  }

  // ---- Escrita (hook) -----------------------------------------------------------

  /** Começa do zero (link novo). */
  reset(): void {
    this.robotMap = new Map();
    this.taskList = [];
    this.trailMap = new Map();
    this.logEntries = [];
    this.startedAt = Date.now();
    this.onChange();
  }

  log(text: string): void {
    const t = (Date.now() - this.startedAt) / 1000;
    const key = streamKey(text);
    const k = key ? this.logEntries.findIndex((e, i) => i < STREAM_LOOKBACK && e.key === key) : -1;
    if (k >= 0) {
      const prev = this.logEntries[k];
      const merged: LinkLogEntry = { ...prev, id: ++this.logSeq, t, text, count: prev.count + 1 };
      this.logEntries = [merged, ...this.logEntries.filter((_, i) => i !== k)];
    } else {
      const entry: LinkLogEntry = { id: ++this.logSeq, t, source: 'backend', text, count: 1, key };
      this.logEntries = [entry, ...this.logEntries].slice(0, LOG_MAX);
    }
    this.onChange();
  }

  /** GET /robots: troca a lista, mantendo a ordem de quem já estava e o que só a tela sabe (LED, rota, telemetria). */
  replaceRobots(list: RobotModel[]): void {
    const incoming = new Map(list.map((r) => [keyOf(r.address), r]));
    const next = new Map<string, VisRobotModel>();
    for (const [k, v] of this.robotMap) {
      const robot = incoming.get(k);
      if (robot) next.set(k, { ...v, robot });
    }
    for (const [k, robot] of incoming) {
      if (!next.has(k)) next.set(k, newEntry(robot));
    }
    this.robotMap = next;
    this.onChange();
  }

  /** robot:new (auto-cadastro no primeiro DOTBOT_ADVERTISEMENT). */
  addRobot(robot: RobotModel): void {
    const k = keyOf(robot.address);
    const v = this.robotMap.get(k);
    this.robotMap.set(k, v ? { ...v, robot } : newEntry(robot));
    if (!v) this.log(`robô novo na API: ${robot.address}`);
    this.onChange();
  }

  setTasks(list: TaskModel[]): void {
    this.taskList = list;
    this.onChange();
  }

  /**
   * robot:update ou GET /robots/:address/status. Devolve false quando o robô
   * não está na lista (o hook recarrega). Estado mais velho que o atual é
   * ignorado (ex.: o GET chegou depois de um robot:update).
   */
  applyTelemetry(address: string, telemetry: RobotTelemetryModel, receivedAt: number): boolean {
    const k = keyOf(address);
    const v = this.robotMap.get(k);
    if (!v) return false;
    if (v.telemetry && telemetry.updatedAt.getTime() < v.telemetry.updatedAt.getTime()) return true;

    const adv = telemetry.advertisement;
    const theta = adv ? VisRobotMapper.thetaFromDirection(adv.direction) : null;
    this.robotMap.set(k, { ...v, telemetry, receivedAt, theta: theta ?? v.theta });

    const pos = VisRobotMapper.position(telemetry);
    if (pos) this.recordTrail(v.robot.address, pos);
    this.onChange();
    return true;
  }

  /** robot:status: o backend recalculou o status pelo silêncio (5 s → Inactive, 60 s → Lost). */
  applyStatus(address: string, status: RobotStatus): void {
    const k = keyOf(address);
    const v = this.robotMap.get(k);
    if (!v || v.robot.status === status) return;
    this.robotMap.set(k, { ...v, robot: { ...v.robot, status } });
    this.log(`${status === RobotStatus.Active ? '✓' : '⚠'} ${v.robot.address} → ${SimRobotMapper.statusLabel(status)}`);
  }

  /** Atualiza um robô com o que a tela acabou de confirmar na API (LED/rota mandados daqui, raio de chegada). */
  patch(address: string, fn: (v: VisRobotModel) => VisRobotModel): void {
    const k = keyOf(address);
    const v = this.robotMap.get(k);
    if (!v) return;
    this.robotMap.set(k, fn(v));
    this.onChange();
  }

  private recordTrail(address: string, p: Vec2Model): void {
    let trail = this.trailMap.get(address);
    if (!trail) {
      trail = [];
      this.trailMap.set(address, trail);
    }
    const last = trail[trail.length - 1];
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) >= TRAIL_MIN_DIST_MM) {
      trail.push(p);
      if (trail.length > TRAIL_MAX_POINTS) trail.splice(0, trail.length - TRAIL_MAX_POINTS);
    }
  }
}
