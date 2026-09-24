import { RAD_TO_DEG, DEG_TO_RAD } from '../Consts/SimulationConsts';
import { DotBotControlMode } from '../enums/DotBotControlMode.enum';
import type { RobotControlMode } from '../enums/RobotControlMode.enum';
import { RobotStatus } from '../enums/RobotStatus.enum';
import type { SwarmitDeviceStatus } from '../enums/SwarmitDeviceStatus.enum';
import { controlModeLabel } from '../Integration/LocalOrchestrator';
import type { ScenarioRobotModel } from '../model/Scenario.Model';
import type { RgbColorModel, SimMapRobotModel, SimRobotModel, SimRobotRowModel } from '../model/SimRobot.Model';

// Paleta determinística por posição do robô na frota (a cor fixa do robô:
// chip, rastro, e círculo/rota enquanto o LED está apagado) — a mesma ideia
// do FALLBACK_COLORS do RobotSwarmSimulator, nas cores do tema.
const PALETTE = ['#2f6fed', '#c0392b', '#1a9e45', '#b8860b', '#8e44ad', '#16a085', '#d35400', '#2c3e50'];

function label(index: number): string {
  return `R${index + 1}`;
}

function color(index: number): string {
  return PALETTE[index % PALETTE.length];
}

/** Cor em que o robô aparece no mapa (círculo e rota): a do LED quando aceso (CMD_RGB_LED ≠ 0,0,0), senão a cor fixa dele. */
function displayColor(robot: { color: string; rgb: RgbColorModel | null }): string {
  const { rgb } = robot;
  return rgb && (rgb.r || rgb.g || rgb.b) ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : robot.color;
}

/** Final curto do address (mesmo rótulo do mapa do RobotSwarmSimulator). */
function shortAddress(address: string): string {
  return `…${address.slice(-4)}`;
}

/** Cor do LED → "#rrggbb" (input type="color"). */
function rgbToHex({ r, g, b }: RgbColorModel): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** "#rrggbb" → cor do LED. */
function hexToRgb(hex: string): RgbColorModel {
  const v = parseInt(hex.slice(1), 16);
  return { r: (v >> 16) & 0xff, g: (v >> 8) & 0xff, b: v & 0xff };
}

const STATUS_LABEL: Record<RobotStatus, string> = {
  [RobotStatus.Active]: 'Active',
  [RobotStatus.Inactive]: 'Inactive',
  [RobotStatus.Lost]: 'Lost',
};

/** Status que o backend calcula pela telemetria (Active/Inactive/Lost). */
function statusLabel(status: RobotStatus): string {
  return STATUS_LABEL[status];
}

function modeLabel(mode: number, loop: boolean): string {
  if (mode !== DotBotControlMode.Auto) return 'MANUAL';
  return loop ? 'AUTO (loop)' : 'AUTO';
}

function toMode(mode: number): DotBotControlMode {
  return mode === DotBotControlMode.Auto ? DotBotControlMode.Auto : DotBotControlMode.Manual;
}

// Traduz o robô (do cenário no modo Editar, ou do snapshot do SimWorld no
// Simular) pros formatos de tela — o mapa (SimMapRobotModel) e a lista do
// menu (SimRobotRowModel). Mesmo papel do RobotMapper (DTO → formato da UI).
export const SimRobotMapper = {
  label,
  color,
  displayColor,
  shortAddress,
  modeLabel,
  statusLabel,
  rgbToHex,
  hexToRgb,

  /** Robô do cenário (pose inicial) → mapa. */
  fromScenario(r: ScenarioRobotModel, index: number): SimMapRobotModel {
    return {
      address: r.address,
      label: label(index),
      color: color(index),
      x: r.start.x_mm,
      y: r.start.y_mm,
      theta: r.start.theta_deg * DEG_TO_RAD,
      status: r.battery > 0 ? RobotStatus.Active : RobotStatus.Lost,
      rgb: r.rgb ?? null,
      mode: toMode(r.mode),
      waypoints: (r.waypoints ?? []).map((w) => ({ x: w.x_mm, y: w.y_mm })),
      waypointIdx: 0,
      loop: r.loop ?? false,
    };
  },

  /** Snapshot do robô simulado → mapa (verde na rede, cinza fora, vermelho sem bateria). */
  fromState(r: SimRobotModel, index: number): SimMapRobotModel {
    return {
      address: r.address,
      label: label(index),
      color: color(index),
      x: r.pos_x,
      y: r.pos_y,
      theta: r.theta,
      status: r.online ? RobotStatus.Active : r.battery <= 0 ? RobotStatus.Lost : RobotStatus.Inactive,
      rgb: r.rgb,
      mode: r.mode,
      waypoints: r.waypoints,
      waypointIdx: r.waypoint_idx,
      loop: r.loop,
    };
  },

  /** Robô do cenário → linha da lista (modo Editar). */
  rowFromScenario(r: ScenarioRobotModel, index: number): SimRobotRowModel {
    return {
      address: r.address,
      label: label(index),
      color: color(index),
      modeLabel: modeLabel(r.mode, r.loop ?? false),
      battery: r.battery,
      x: r.start.x_mm,
      y: r.start.y_mm,
      thetaDeg: r.start.theta_deg,
      waypoints: r.waypoints?.length ?? 0,
      waypointIdx: null,
      loop: r.loop ?? false,
    };
  },

  /** Snapshot + o que o backend local enxerga → linha da lista (modo Simular). */
  rowFromState(
    r: SimRobotModel,
    index: number,
    seen: {
      backendStatus: RobotStatus | null;
      swarmitStatus: SwarmitDeviceStatus | null;
      /** Modo de orquestração (coluna `mode`) — null = backend ainda não cadastrou; aí vale o do fio. */
      backendMode: RobotControlMode | null;
      taskName: string | null;
    },
  ): SimRobotRowModel {
    return {
      address: r.address,
      label: label(index),
      color: color(index),
      modeLabel: seen.backendMode !== null ? controlModeLabel(seen.backendMode) : modeLabel(r.mode, r.loop),
      battery: r.battery,
      x: r.pos_x,
      y: r.pos_y,
      thetaDeg: r.theta * RAD_TO_DEG,
      waypoints: r.waypoints.length,
      waypointIdx: r.waypoint_idx,
      loop: r.loop,
      sim: {
        online: r.online,
        appRunning: r.appRunning,
        backendStatus: seen.backendStatus,
        swarmitStatus: seen.swarmitStatus,
        taskName: seen.taskName,
      },
    };
  },
};
