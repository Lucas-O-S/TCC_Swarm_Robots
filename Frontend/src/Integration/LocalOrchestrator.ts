import { DEFAULT_WAYPOINT_THRESHOLD_MM } from '../Consts/SimulationConsts';
import { DotBotControlMode } from '../enums/DotBotControlMode.enum';
import { RobotControlMode } from '../enums/RobotControlMode.enum';
import { RobotStatus } from '../enums/RobotStatus.enum';
import { TaskStatus } from '../enums/TaskStatus.enum';
import type { TaskModel, TaskWaypointModel } from '../model/Task.Model';
import type { FleetCommand } from './FleetLink';
import type { DotBotAdvertisement } from './Protocols/DotBot.Payload';

// Orquestrador do backend de bolso — porte do OrchestratorService do backend
// (Backend/server/src/Classes/Orchestrator/Orchestrator.Service.ts), com as
// tabelas que ele usa (`tasks` e as colunas `mode`/`taskId` de `robots`) em
// memória. Os três modos de ORQUESTRAÇÃO (RobotControlMode):
//   - Manual: dirigido no joystick; o orquestrador não mexe;
//   - SemiAuto: executa tasks sozinho (segue os waypoints), mas só recebe
//     task atribuída por um humano (PUT /orchestrator/robots/:address/assign);
//   - Auto: entra na fila — a cada RUN_TIME (5 s) `assignPending` dá a
//     próxima task pendente (menor `priority` primeiro) a um robô livre.
// A task desce como LH2_WAYPOINTS (o robô entra em AUTO no fio) e é
// concluída quando o DOTBOT_ADVERTISEMENT mostra waypoint_idx no fim da rota.
// Diferenças deliberadas em relação ao backend, marcadas com "DIFERENÇA".

/** RUN_TIME do OrchestratorService (5000 ms). */
export const ORCHESTRATOR_RUN_S = 5;
/** LOW_BATTERY_VOLTS = 3.0 — aqui comparado direto em mV, como chega no advertisement. */
const LOW_BATTERY_MV = 3000;
/** Tolerância pra comparar o waypoint do advertisement (u32 arredondado) com o da task. */
const WAYPOINT_MATCH_MM = 1;

/** As colunas de `robots` que o orquestrador usa. */
export interface OrchestratorRobotRecord {
  address: string;
  mode: RobotControlMode;
  taskId: string | null;
  waypointsThreshold: number;
}

/** O que o orquestrador precisa do LocalFleetLink. */
export interface OrchestratorHost {
  clock(): number;
  send(cmd: FleetCommand): void;
  log(text: string): void;
  statusOf(address: string): RobotStatus | null;
}

const MODE_LABEL: Record<RobotControlMode, string> = {
  [RobotControlMode.Manual]: 'MANUAL',
  [RobotControlMode.SemiAuto]: 'SEMI-AUTO',
  [RobotControlMode.Auto]: 'AUTO',
};

export function controlModeLabel(mode: RobotControlMode): string {
  return MODE_LABEL[mode];
}

const STATUS_LABEL: Record<TaskStatus, string> = {
  [TaskStatus.Pending]: 'pendente',
  [TaskStatus.InProgress]: 'em andamento',
  [TaskStatus.Completed]: 'concluída',
  [TaskStatus.Cancelled]: 'cancelada',
};

export function taskStatusLabel(status: TaskStatus): string {
  return STATUS_LABEL[status];
}

function ordered(waypoints: TaskWaypointModel[]): TaskWaypointModel[] {
  return [...waypoints].sort((a, b) => a.orderIndex - b.orderIndex);
}

export class LocalOrchestrator {
  private readonly host: OrchestratorHost;
  private readonly robots = new Map<string, OrchestratorRobotRecord>();
  private taskList: TaskModel[] = [];
  private nextRunAt = ORCHESTRATOR_RUN_S;

  constructor(host: OrchestratorHost) {
    this.host = host;
  }

  // ---- leitura (UI) -------------------------------------------------------------

  /** Tasks não apagadas, na ordem de criação. */
  get tasks(): readonly TaskModel[] {
    return this.taskList.filter((t) => !t.isDeleted);
  }

  /** Registro do robô no "banco" — null = backend ainda não cadastrou (nenhum advertisement). */
  robot(address: string): OrchestratorRobotRecord | null {
    return this.robots.get(address) ?? null;
  }

  taskOf(address: string): TaskModel | null {
    const id = this.robots.get(address)?.taskId;
    return id ? (this.find(id) ?? null) : null;
  }

  /** Segundos até a próxima rodada do `assignPending`. */
  secondsToNextRun(): number {
    return Math.max(0, this.nextRunAt - this.host.clock());
  }

  /** Robôs que a próxima rodada consideraria livres (mesmo filtro do getFreeRobots). */
  freeAutoRobots(): OrchestratorRobotRecord[] {
    return [...this.robots.values()].filter(
      (r) => r.taskId === null && r.mode === RobotControlMode.Auto && this.host.statusOf(r.address) !== RobotStatus.Lost,
    );
  }

  // ---- eventos que chegam do link ------------------------------------------------

  /** onAdvertisement do backend — e o findOrCreateByAddress no primeiro. */
  onAdvertisement(address: string, adv: DotBotAdvertisement): void {
    let robot = this.robots.get(address);
    if (!robot) {
      // DIFERENÇA: o modo inicial vem do modo do fio no 1º advertisement, no
      // lugar do default do banco: MANUAL → Manual; AUTO → SemiAuto (segue a
      // rota do cenário e fica FORA da fila — senão a primeira rodada do
      // orquestrador trocaria a rota do cenário por uma task). Auto é opt-in.
      robot = {
        address,
        mode: adv.mode === DotBotControlMode.Auto ? RobotControlMode.SemiAuto : RobotControlMode.Manual,
        taskId: null,
        waypointsThreshold: DEFAULT_WAYPOINT_THRESHOLD_MM,
      };
      this.robots.set(address, robot);
    }
    if (!robot.taskId) return;

    const task = this.find(robot.taskId);
    if (!task) {
      robot.taskId = null;
      return;
    }

    if (adv.battery <= LOW_BATTERY_MV) {
      this.releaseTo(robot, task, TaskStatus.Pending);
      this.host.log(`[ORQ] ${address} com bateria baixa → task "${task.name}" voltou pra fila`);
      return;
    }

    // DIFERENÇA: além de waypoint_idx >= nº de pontos (a regra do backend),
    // exige que o waypoint atual do advertisement seja o ÚLTIMO da task. Sem
    // isso, um advertisement que saiu antes do LH2_WAYPOINTS chegar (ainda
    // com o idx da rota anterior, já no fim) conclui a task na hora — a
    // mesma corrida existe no backend real.
    const points = ordered(task.waypoints);
    const last = points[points.length - 1];
    const onThisRoute =
      last !== undefined &&
      Math.abs(adv.waypoint_x - last.x) <= WAYPOINT_MATCH_MM &&
      Math.abs(adv.waypoint_y - last.y) <= WAYPOINT_MATCH_MM;
    if (adv.mode === DotBotControlMode.Auto && adv.waypoint_idx >= points.length && onThisRoute) {
      this.releaseTo(robot, task, TaskStatus.Completed);
      this.host.log(`[ORQ] task "${task.name}" concluída por ${address}`);
    }
  }

  /** handleRobotLost: o robô virou Lost (60 s sem telemetria) → a task volta pra fila. */
  onLost(address: string): void {
    const robot = this.robots.get(address);
    const task = robot?.taskId ? this.find(robot.taskId) : undefined;
    if (!robot || !task) return;
    this.releaseTo(robot, task, TaskStatus.Pending);
    this.host.log(`[ORQ] robô ${address} sumiu → task "${task.name}" voltou pra fila`);
  }

  /** Chamado a cada lote de ticks: roda o `assignPending` no ritmo do RUN_TIME (tempo simulado). */
  update(): void {
    const now = this.host.clock();
    if (now < this.nextRunAt) return;
    this.nextRunAt = now + ORCHESTRATOR_RUN_S;
    this.assignPending();
  }

  // ---- ações (o que as rotas do backend fazem) ----------------------------------

  /**
   * Atribuição MANUAL (assignTaskManually) — o uso típico é o SemiAuto.
   * Devolve a mensagem de erro (as mesmas validações do backend) ou null.
   */
  assign(address: string, taskId: string): string | null {
    const robot = this.robots.get(address);
    if (!robot) return `Nenhum robô com o endereço '${address}' — o backend ainda não recebeu telemetria dele.`;
    if (robot.mode === RobotControlMode.Manual) return `Robô ${address} está em modo Manual.`;
    if (robot.taskId) return `Robô ${address} já está executando uma task.`;
    const task = this.find(taskId);
    if (!task) return `Nenhuma task com uuid '${taskId}'.`;
    if (!task.waypoints.length) return `Task "${task.name}" não tem waypoints.`;
    // DIFERENÇA: o backend não confere o status — daria pra atribuir a mesma task a dois robôs.
    if (task.status !== TaskStatus.Pending) return `Task "${task.name}" está ${taskStatusLabel(task.status)}.`;

    this.host.log(`[ORQ] task "${task.name}" atribuída manualmente a ${address}`);
    this.start(robot, task);
    return null;
  }

  /**
   * DIFERENÇA (extensão, o backend não tem rota pra isso): no SemiAuto o
   * operador pode largar a task no meio. O robô recebe uma rota vazia (para
   * onde está) e a task volta pra fila como Pending — a tela não cancela task
   * de verdade, isso é da tela Tarefas.
   */
  release(address: string): string | null {
    const robot = this.robots.get(address);
    const task = robot?.taskId ? this.find(robot.taskId) : undefined;
    if (!robot || !task) return 'Este robô não está executando nenhuma task.';
    if (robot.mode !== RobotControlMode.SemiAuto) return 'Só dá pra largar a task no modo Semi-auto — no Auto quem decide é o orquestrador.';
    this.host.log(`[ORQ] ${address} largou a task "${task.name}" (operador) → voltou pra fila`);
    this.releaseTo(robot, task, TaskStatus.Pending);
    this.host.send({ kind: 'waypoints', destination: address, threshold: robot.waypointsThreshold, waypoints: [] });
    return null;
  }

  /**
   * DIFERENÇA (extensão): troca a task do robô SemiAuto no meio — a atual
   * volta pra fila e a nova desce como LH2_WAYPOINTS, saindo de onde ele está.
   */
  switchTask(address: string, taskId: string): string | null {
    const robot = this.robots.get(address);
    const current = robot?.taskId ? this.find(robot.taskId) : undefined;
    if (!robot || !current) return this.assign(address, taskId);
    if (robot.mode !== RobotControlMode.SemiAuto) return 'Só dá pra trocar a task no modo Semi-auto — no Auto quem decide é o orquestrador.';
    const next = this.find(taskId);
    if (!next) return `Nenhuma task com uuid '${taskId}'.`;
    if (next.uuid === current.uuid) return null;
    if (!next.waypoints.length) return `Task "${next.name}" não tem waypoints.`;
    if (next.status !== TaskStatus.Pending) return `Task "${next.name}" está ${taskStatusLabel(next.status)}.`;
    this.host.log(`[ORQ] ${address} trocou a task "${current.name}" (voltou pra fila) por "${next.name}"`);
    this.releaseTo(robot, current, TaskStatus.Pending);
    this.start(robot, next);
    return null;
  }

  /** Muda a coluna `mode` e manda o CONTROL_MODE equivalente no fio (Manual → MANUAL; SemiAuto/Auto → AUTO). */
  setMode(address: string, mode: RobotControlMode): string | null {
    const robot = this.robots.get(address);
    if (!robot) return 'O backend ainda não cadastrou este robô.';
    if (robot.mode === mode) return null;
    robot.mode = mode;
    // DIFERENÇA: ir pra Manual com task em andamento devolve a task pra fila
    // (o backend só troca a coluna e a task ficaria presa em InProgress).
    const task = robot.taskId ? this.find(robot.taskId) : undefined;
    if (mode === RobotControlMode.Manual && task) {
      this.releaseTo(robot, task, TaskStatus.Pending);
      this.host.log(`[ORQ] ${address} foi pra Manual → task "${task.name}" voltou pra fila`);
    }
    this.host.log(`[ORQ] modo de ${address} → ${controlModeLabel(mode)}`);
    this.host.send({
      kind: 'control-mode',
      destination: address,
      mode: mode === RobotControlMode.Manual ? DotBotControlMode.Manual : DotBotControlMode.Auto,
    });
    return null;
  }

  setThreshold(address: string, mm: number): void {
    const robot = this.robots.get(address);
    if (robot && mm > 0) robot.waypointsThreshold = mm;
  }

  /**
   * GET /tasks — a tela NÃO cria nem apaga task (isso é da tela Tarefas /
   * API); só puxa a lista e seleciona. Offline, quem passa aqui são as
   * tasks mock do SimulationService.
   */
  loadTasks(tasks: TaskModel[]): void {
    this.taskList = tasks.map((t) => ({ ...t, waypoints: t.waypoints.map((w) => ({ ...w })), robots: [] }));
    this.host.log(`[ORQ] ${tasks.length} task(s) puxada(s) do backend`);
  }

  // ---- internos -----------------------------------------------------------------

  /** assignPending: tasks pendentes com pontos, menor prioridade primeiro, pro próximo robô Auto livre. */
  private assignPending(): void {
    const pending = this.taskList
      .filter((t) => !t.isDeleted && t.status === TaskStatus.Pending)
      .sort((a, b) => a.priority - b.priority);
    const free = this.freeAutoRobots();

    for (const task of pending) {
      if (!task.waypoints.length) continue; // task sem pontos não é atribuível
      const robot = free.pop();
      if (!robot) break;
      this.host.log(`[ORQ] atribuindo task "${task.name}" ao robô ${robot.address}`);
      this.start(robot, task);
    }
  }

  private start(robot: OrchestratorRobotRecord, task: TaskModel): void {
    this.host.send({
      kind: 'waypoints',
      destination: robot.address,
      threshold: robot.waypointsThreshold,
      waypoints: ordered(task.waypoints).map((w) => ({ x: w.x, y: w.y })),
    });
    task.status = TaskStatus.InProgress;
    task.robots = [{ uuid: robot.address, address: robot.address, name: robot.address }];
    robot.taskId = task.uuid;
  }

  private releaseTo(robot: OrchestratorRobotRecord, task: TaskModel, status: TaskStatus): void {
    task.status = status;
    if (status === TaskStatus.Pending) task.robots = [];
    robot.taskId = null;
  }

  private find(uuid: string): TaskModel | undefined {
    return this.taskList.find((t) => t.uuid === uuid && !t.isDeleted);
  }
}
