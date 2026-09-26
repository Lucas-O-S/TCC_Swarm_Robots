import { DEG_TO_RAD, RAD_TO_DEG } from '../Consts/SimulationConsts';
import { DotBotControlMode } from '../enums/DotBotControlMode.enum';
import { controlModeLabel } from '../Integration/LocalOrchestrator';
import type { RobotTelemetryModel } from '../model/RobotTelemetry.Model';
import type { SimMapRobotModel } from '../model/SimRobot.Model';
import type { Vec2Model } from '../model/SimWorld.Model';
import type { VisRobotModel, VisRobotRowModel } from '../model/VisRobot.Model';
import { clamp } from '../screens/Simulation/SimPhysics';
import { RobotMapper } from './Robot.Mapper';
import { SimRobotMapper } from './SimRobot.Mapper';

/** pos_x/pos_y = 0xFFFFFFFF: o robô ainda não se localizou (mesma regra do SwarmService.persistPosition). */
const NO_POSITION = 0xffffffff;
/** direction = 0xFFFF no fio, que o decode com sinal do backend entrega como -1: sem leitura. */
const NO_DIRECTION = -1;

interface ArenaSize {
  width: number;
  height: number;
}

/** Posição (mm) do último advertisement, ou null sem telemetria/localização. */
function position(t: RobotTelemetryModel | null): Vec2Model | null {
  const adv = t?.advertisement;
  if (!adv || adv.pos_x === NO_POSITION || adv.pos_y === NO_POSITION) return null;
  return { x: adv.pos_x, y: adv.pos_y };
}

/** direction (graus, anti-horário a partir de +X, a convenção do simulador) → theta em rad; null = sem leitura. */
function thetaFromDirection(direction: number): number | null {
  return direction === NO_DIRECTION ? null : direction * DEG_TO_RAD;
}

/** mV do advertisement → % (mesma rampa 3,0–4,2 V do RobotMapper). */
function batteryPercent(millivolts: number): number {
  return RobotMapper.batteryToPercent(millivolts / 1000);
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
  batteryPercent,

  /**
   * Robô → mapa, ou null sem posição (não dá pra desenhar). Fora da arena,
   * o marcador fica na borda (a lista avisa). A rota desenhada é a conhecida:
   * a da tarefa (quando a API mandar os pontos) ou, sem tarefa, a última
   * avulsa mandada daqui; sem nenhuma, só o alvo atual do advertisement.
   */
  toMap(v: VisRobotModel, index: number, arena: ArenaSize, taskPoints: Vec2Model[] | null): SimMapRobotModel | null {
    const pos = position(v.telemetry);
    const adv = v.telemetry?.advertisement;
    if (!pos || !adv) return null;

    const wireAuto = adv.mode === DotBotControlMode.Auto;
    const known = v.robot.taskId ? (taskPoints ?? []) : (v.route?.points ?? []);
    const hasTarget = adv.waypoint_x !== 0 || adv.waypoint_y !== 0;
    const waypoints = known.length > 0 ? known : wireAuto && hasTarget ? [{ x: adv.waypoint_x, y: adv.waypoint_y }] : [];

    return {
      address: v.robot.address,
      label: SimRobotMapper.label(index),
      color: SimRobotMapper.color(index),
      x: clamp(pos.x, 0, arena.width),
      y: clamp(pos.y, 0, arena.height),
      theta: v.theta,
      status: v.robot.status,
      rgb: v.rgb,
      mode: wireAuto ? DotBotControlMode.Auto : DotBotControlMode.Manual,
      waypoints,
      waypointIdx: known.length > 0 ? adv.waypoint_idx : 0,
      loop: false,
    };
  },

  /** Robô → linha da lista. Bateria do advertisement quando tem; senão a última gravada pela API. */
  toRow(v: VisRobotModel, index: number, arena: ArenaSize | null, taskName: string | null): VisRobotRowModel {
    const pos = position(v.telemetry);
    const adv = v.telemetry?.advertisement ?? null;
    return {
      address: v.robot.address,
      label: SimRobotMapper.label(index),
      name: v.robot.name,
      color: SimRobotMapper.color(index),
      status: v.robot.status,
      modeLabel: controlModeLabel(v.robot.mode),
      wireAuto: adv ? adv.mode === DotBotControlMode.Auto : null,
      battery: adv ? batteryPercent(adv.battery) : RobotMapper.batteryToPercent(v.robot.battery),
      pose: pos ? { x: pos.x, y: pos.y, thetaDeg: v.theta * RAD_TO_DEG } : null,
      outside: pos !== null && arena !== null && isOutside(pos, arena),
      waypointIdx: adv ? adv.waypoint_idx : null,
      taskName,
    };
  },
};
