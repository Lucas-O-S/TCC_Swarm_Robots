import { DEG_TO_RAD, RAD_TO_DEG } from '../Consts/SimulationConsts';
import { DotBotControlMode } from '../enums/DotBotControlMode.enum';
import { PositionSource } from '../enums/PositionSource.enum';
import { controlModeLabel } from '../Integration/LocalOrchestrator';
import type { RobotTelemetryModel } from '../model/RobotTelemetry.Model';
import type { SimMapRobotModel } from '../model/SimRobot.Model';
import type { Vec2Model } from '../model/SimWorld.Model';
import type { VisRobotModel, VisRobotRowModel } from '../model/VisRobot.Model';
import { clamp } from '../screens/Simulation/Service/SimPhysics';
import { RobotMapper } from './Robot.Mapper';
import { SimRobotMapper } from './SimRobot.Mapper';

interface ArenaSize {
  width: number;
  height: number;
}

/**
 * Posição (mm) da última telemetria, ou null sem telemetria/localização. Só
 * LH2 vai pro mapa: GPS vem em graus e a arena é em mm.
 */
function position(t: RobotTelemetryModel | null): Vec2Model | null {
  const p = t?.position;
  if (!p || p.source !== PositionSource.LH2) return null;
  return { x: p.x, y: p.y };
}

/** direction (graus, anti-horário a partir de +X, a convenção do simulador) → theta em rad; null = sem leitura. */
function thetaFromDirection(direction: number | null): number | null {
  return direction === null ? null : direction * DEG_TO_RAD;
}

/** Rota que a tela conhece: a da tarefa (quando a API mandar os pontos) ou, sem tarefa, a última avulsa mandada daqui. */
function knownRoute(v: VisRobotModel, taskPoints: Vec2Model[] | null): Vec2Model[] {
  return v.robot.taskId ? (taskPoints ?? []) : (v.route?.points ?? []);
}

function isOutside(p: Vec2Model, arena: ArenaSize): boolean {
  return p.x < 0 || p.y < 0 || p.x > arena.width || p.y > arena.height;
}

// Traduz o robô do Visualizador (registro da API + telemetria) pros
// formatos de tela: o do mapa (o mesmo SimMapRobotModel da Simulação, pra
// reaproveitar o SimulationMap) e a linha da lista do menu.
export const VisRobotMapper = {
  position,
  thetaFromDirection,

  /**
   * Robô → mapa, ou null sem posição (não dá pra desenhar). Fora da arena,
   * o marcador fica na borda (a lista avisa). O robô conta como seguindo rota
   * (AUTO no mapa) quando a tela conhece uma — o robot:update não traz o
   * modo do fio nem o alvo atual.
   */
  toMap(
    v: VisRobotModel,
    index: number,
    arena: ArenaSize,
    taskPoints: Vec2Model[] | null,
    /** Pose suavizada (PoseTween) no lugar da última amostra crua. */
    shown: { x: number; y: number; theta: number } | null = null,
  ): SimMapRobotModel | null {
    const raw = position(v.telemetry);
    if (!raw) return null;
    const pos = shown ?? { ...raw, theta: v.theta };

    const waypoints = knownRoute(v, taskPoints);
    const onRoute = waypoints.length > 0;

    return {
      address: v.robot.address,
      label: SimRobotMapper.label(index),
      color: SimRobotMapper.color(index),
      x: clamp(pos.x, 0, arena.width),
      y: clamp(pos.y, 0, arena.height),
      theta: pos.theta,
      status: v.robot.status,
      rgb: v.rgb,
      mode: onRoute ? DotBotControlMode.Auto : DotBotControlMode.Manual,
      waypoints,
      waypointIdx: onRoute ? (v.telemetry?.waypointIdx ?? 0) : 0,
      loop: false,
    };
  },

  /** Robô → linha da lista. Bateria da telemetria quando tem; senão a última gravada pela API. */
  toRow(v: VisRobotModel, index: number, arena: ArenaSize | null, taskName: string | null): VisRobotRowModel {
    const t = v.telemetry;
    const pos = position(t);
    return {
      address: v.robot.address,
      label: SimRobotMapper.label(index),
      name: v.robot.name,
      color: SimRobotMapper.color(index),
      status: v.robot.status,
      modeLabel: controlModeLabel(v.robot.mode),
      hasTelemetry: t !== null,
      onRoute: v.robot.taskId !== null || v.route !== null,
      battery: RobotMapper.batteryToPercent(t?.battery ?? v.robot.battery),
      pose: pos ? { x: pos.x, y: pos.y, thetaDeg: v.theta * RAD_TO_DEG } : null,
      outside: pos !== null && arena !== null && isOutside(pos, arena),
      waypointIdx: t?.waypointIdx ?? null,
      taskName,
    };
  },
};
