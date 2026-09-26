import type { RobotControlMode } from '../enums/RobotControlMode.enum';
import type { RobotStatus } from '../enums/RobotStatus.enum';
import type { SocketEvents } from '../enums/SocketEvents.enum';
import type { RobotModel } from '../model/Robot.Model';
import type { RobotTelemetryModel } from '../model/RobotTelemetry.Model';
import type { RgbColorModel } from '../model/SimRobot.Model';
import type { Vec2Model } from '../model/SimWorld.Model';
import type { TaskModel } from '../model/Task.Model';
import type { ServiceResult } from '../services/Robot.Service';

// Contrato entre a tela do Visualizador e a API (backend NestJS). Faz o
// mesmo papel do FleetLink na Simulação: a tela e o hook
// (screens/Visualizer/useVisualizer.ts) só falam com a API por aqui, em
// tipos neutros. Quem conhece URL, socket e envelope é a implementação:
//   - DisconnectedApiLink (a única por enquanto): não conecta em nada. A
//     conexão com a API ainda não existe, então a tela abre sem robôs e
//     todo comando volta com "sem conexão";
//   - a implementação real (a fazer): REST pelo `Callout` + socket.io nos
//     eventos de enums/SocketEvents.enum.ts. Pra ligar, é instanciar ela no
//     lugar do DisconnectedApiLink em useVisualizer.ts.
//
// Rotas e eventos conferidos no backend (Backend/server/src):
// Robot.Controller.ts, Swarm.Controller.ts, Orchestrator.Controller.ts,
// Task.Controller.ts e Websockets/Robot.Websockets.ts. O `address` vai
// exatamente como a API devolve: o backend grava em hex minúsculo e busca
// com igualdade.

/** Situação da conexão, pro header e pro log da tela. */
export type ApiLinkStatus = 'unavailable' | 'connecting' | 'connected' | 'disconnected';

export interface ApiLinkState {
  status: ApiLinkStatus;
  /** Texto curto: motivo da queda, "conexão não implementada"... */
  message: string;
}

/** Eventos do socket, já traduzidos pros models do front. */
export type ApiLinkEvent =
  | { kind: typeof SocketEvents.RobotUpdate; address: string; telemetry: RobotTelemetryModel }
  | { kind: typeof SocketEvents.RobotStatus; address: string; status: RobotStatus }
  | { kind: typeof SocketEvents.RobotNew; robot: RobotModel };

export interface ApiLink {
  /** Conecta e avisa pelo `onState`. Resolve depois da tentativa; se deu certo ou não, vem pelo estado. */
  start(): Promise<void>;
  stop(): void;
  onState(cb: (state: ApiLinkState) => void): void;
  onEvent(cb: (event: ApiLinkEvent) => void): void;

  // ---- Leitura (REST) ------------------------------------------------------

  /** GET /robots */
  listRobots(): Promise<ServiceResult<RobotModel[]>>;
  /** GET /robots/:address/status: último estado quente do SwarmService (null = nada recebido desde que o backend subiu). */
  getTelemetry(address: string): Promise<ServiceResult<RobotTelemetryModel | null>>;
  /** GET /tasks. Hoje o backend não inclui os waypoints na lista (o getAll não faz include). */
  listTasks(): Promise<ServiceResult<TaskModel[]>>;

  // ---- Comandos (REST, por address) ---------------------------------------

  /** PUT /robots/:address/move-raw: joystick, int8 por roda (esquerda em left_y, direita em right_y, como na Simulação). */
  moveRaw(address: string, left: number, right: number): Promise<ServiceResult<void>>;
  /** PUT /robots/:address/rgb-led */
  rgbLed(address: string, color: RgbColorModel): Promise<ServiceResult<void>>;
  /**
   * PUT /robots/:address/control-mode, com o modo de ORQUESTRAÇÃO (o DTO da
   * rota usa `RobotControlMode`). ATENÇÃO: no backend atual a rota só manda
   * o byte CONTROL_MODE pro robô, cru, e não grava `robots.mode`.
   */
  controlMode(address: string, mode: RobotControlMode): Promise<ServiceResult<void>>;
  /** PUT /robots/:address/waypoints: rota avulsa (LH2_WAYPOINTS), em mm. */
  waypoints(address: string, threshold: number, points: Vec2Model[]): Promise<ServiceResult<void>>;
  /** PUT /orchestrator/robots/:address/assign: atribuição manual de tarefa (Semi-auto). */
  assignTask(address: string, taskId: string): Promise<ServiceResult<void>>;
  /** PUT /robots/:uuid com `waypointsThreshold`: raio de chegada das próximas tarefas. */
  setWaypointsThreshold(uuid: string, mm: number): Promise<ServiceResult<void>>;
}
