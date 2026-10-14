import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import type { z } from 'zod';
import { robotNewEventDtoSchema, robotStatusEventDtoSchema, robotUpdateEventDtoSchema } from '../dto/robot.socket.dto';
import type { RobotControlMode } from '../enums/RobotControlMode.enum';
import type { RobotStatus } from '../enums/RobotStatus.enum';
import { SocketEvents } from '../enums/SocketEvents.enum';
import { RobotMapper } from '../mapper/Robot.Mapper';
import { RobotTelemetryMapper } from '../mapper/RobotTelemetry.Mapper';
import type { RgbColorModel } from '../model/SimRobot.Model';
import type { Vec2Model } from '../model/SimWorld.Model';
import { OrchestratorService } from '../services/Orchestrator.Service';
import { RobotService } from '../services/Robot.Service';
import { RobotStateService } from '../services/RobotState.Service';
import { success } from '../services/ServiceResult';
import type { ServiceResult } from '../services/ServiceResult';
import { TaskService } from '../services/Task.Service';
import type { ApiLink, ApiLinkEvent, ApiLinkState } from './ApiLink';

const API_URL = import.meta.env.VITE_API_URL;

/** Os comandos devolvem recibo/model; pro ApiLink só importa se deu certo. */
function toVoid(res: ServiceResult<unknown>): ServiceResult<void> {
  return res.ok ? success(undefined) : res;
}

// ApiLink real: REST pelos services (Callout + envelope) e socket.io no
// gateway `RobotWebsockets` do backend — mesma URL da API (VITE_API_URL),
// namespace raiz, path padrão /socket.io, sem token (o gateway não pede).
// O socket.io reconecta sozinho; cada `connect` (inclusive depois de cair)
// vira `connected`, e o useVisualizer recarrega a lista nesse momento — é o
// que recupera o que passou enquanto estava fora, já que o backend não
// manda o estado atual ao conectar.
export class SocketApiLink implements ApiLink {
  private socket: Socket | null = null;
  private stateCb: ((state: ApiLinkState) => void) | null = null;
  private eventCb: ((event: ApiLinkEvent) => void) | null = null;

  start(): Promise<void> {
    if (!API_URL) {
      this.stateCb?.({ status: 'unavailable', message: 'VITE_API_URL não configurada no .env.' });
      return Promise.resolve();
    }

    this.stateCb?.({ status: 'connecting', message: `Conectando ao socket da API em ${API_URL}…` });
    const socket = io(API_URL, { transports: ['websocket'], reconnection: true });
    this.socket = socket;

    socket.on('connect', () => this.stateCb?.({ status: 'connected', message: 'Conectado à API (ao vivo).' }));
    socket.on('disconnect', (reason) => this.stateCb?.({ status: 'disconnected', message: `Socket da API caiu (${reason}).` }));
    socket.on('connect_error', (error) =>
      this.stateCb?.({ status: 'disconnected', message: `Sem conexão com o socket da API (${error.message}) — tentando de novo…` }),
    );

    this.listen(SocketEvents.RobotUpdate, robotUpdateEventDtoSchema, (dto) =>
      this.eventCb?.({ kind: SocketEvents.RobotUpdate, address: dto.address, telemetry: RobotTelemetryMapper.fromUpdateEvent(dto) }),
    );
    this.listen(SocketEvents.RobotStatus, robotStatusEventDtoSchema, (dto) =>
      this.eventCb?.({ kind: SocketEvents.RobotStatus, address: dto.address, status: dto.status as RobotStatus }),
    );
    this.listen(SocketEvents.RobotNew, robotNewEventDtoSchema, (dto) =>
      this.eventCb?.({ kind: SocketEvents.RobotNew, robot: RobotMapper.fromDto(dto.robot) }),
    );

    return Promise.resolve();
  }

  /** Tira os listeners antes de desconectar: o `disconnect` local não deve virar aviso de queda. */
  stop(): void {
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
  }

  onState(cb: (state: ApiLinkState) => void): void {
    this.stateCb = cb;
  }

  onEvent(cb: (event: ApiLinkEvent) => void): void {
    this.eventCb = cb;
  }

  /** Payload fora do contrato é descartado (com aviso no console), sem derrubar a tela. */
  private listen<T>(event: SocketEvents, schema: z.ZodType<T>, handle: (dto: T) => void): void {
    this.socket?.on(event, (raw: unknown) => {
      const parsed = schema.safeParse(raw);
      if (parsed.success) handle(parsed.data);
      else console.warn(`[SocketApiLink] ${event} fora do formato esperado`, parsed.error.issues);
    });
  }

  // ---- Leitura (REST) ------------------------------------------------------

  listRobots() {
    return RobotService.list();
  }

  getTelemetry(address: string) {
    return RobotStateService.getTelemetry(address);
  }

  listTasks() {
    return TaskService.list();
  }

  // ---- Comandos (REST, por address) ---------------------------------------

  async moveRaw(address: string, left: number, right: number) {
    return toVoid(await RobotService.moveRaw(address, { leftX: 0, leftY: left, rightX: 0, rightY: right }));
  }

  async rgbLed(address: string, color: RgbColorModel) {
    return toVoid(await RobotService.setRgbLed(address, { red: color.r, green: color.g, blue: color.b }));
  }

  async controlMode(address: string, mode: RobotControlMode) {
    return toVoid(await RobotService.setControlMode(address, mode));
  }

  async waypoints(address: string, threshold: number, points: Vec2Model[]) {
    return toVoid(await RobotService.sendWaypoints(address, { threshold, waypoints: points }));
  }

  async assignTask(address: string, taskId: string) {
    return toVoid(await OrchestratorService.assignTask(address, taskId));
  }

  async setWaypointsThreshold(uuid: string, mm: number) {
    return toVoid(await RobotService.update(uuid, { waypointsThreshold: mm }));
  }
}
