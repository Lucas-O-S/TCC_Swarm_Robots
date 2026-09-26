import type { RobotStatus } from '../enums/RobotStatus.enum';
import type { RobotModel } from './Robot.Model';
import type { RobotTelemetryModel } from './RobotTelemetry.Model';
import type { RgbColorModel } from './SimRobot.Model';
import type { Vec2Model } from './SimWorld.Model';

/** Rota avulsa mandada desta tela (LH2_WAYPOINTS): a API não devolve a rota que o robô está seguindo. */
export interface VisRouteModel {
  points: Vec2Model[];
  threshold: number;
}

/**
 * Robô no Visualizador: o registro da API (GET /robots, robot:new,
 * robot:status) + a última telemetria (robot:update) + o que só esta tela
 * sabe (último LED e última rota mandados daqui, rumo mantido quando o
 * advertisement chega sem leitura de direção). Ver `useVisualizer.ts`.
 */
export interface VisRobotModel {
  robot: RobotModel;
  telemetry: RobotTelemetryModel | null;
  /** Quando a telemetria chegou neste navegador (ms, Date.now): base do "há X s", sem depender do relógio do servidor. */
  receivedAt: number | null;
  /** Rumo em rad (anti-horário a partir de +X), o último conhecido. */
  theta: number;
  rgb: RgbColorModel | null;
  route: VisRouteModel | null;
}

/** Linha da lista de robôs do Visualizador (ver `VisRobotCard`). */
export interface VisRobotRowModel {
  address: string;
  label: string;
  name: string;
  color: string;
  status: RobotStatus;
  /** Modo de orquestração (coluna `mode` da API). */
  modeLabel: string;
  /** Modo no fio, do último advertisement — null sem telemetria. */
  wireAuto: boolean | null;
  battery: number;
  pose: { x: number; y: number; thetaDeg: number } | null;
  /** Posição fora da arena do cenário escolhido. */
  outside: boolean;
  waypointIdx: number | null;
  taskName: string | null;
}
