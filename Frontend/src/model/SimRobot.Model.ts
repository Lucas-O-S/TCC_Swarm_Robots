import type { DotBotControlMode } from '../enums/DotBotControlMode.enum';
import type { RobotApplication } from '../enums/RobotApplication.enum';
import type { RobotStatus } from '../enums/RobotStatus.enum';
import type { SwarmitDeviceStatus } from '../enums/SwarmitDeviceStatus.enum';
import type { Vec2Model } from './SimWorld.Model';

/** Cor do LED (CMD_RGB_LED 0x01), 0–255 por canal. */
export interface RgbColorModel {
  r: number;
  g: number;
  b: number;
}

/**
 * Snapshot imutável de um robô simulado — os campos do DOTBOT_ADVERTISEMENT
 * (ver `SimRobot.snapshot()`). mm, theta em RADIANOS.
 */
export interface SimRobotModel {
  address: string;
  application: RobotApplication;
  mode: DotBotControlMode;
  /** Na rede Mari: false = bateria zerada OU falha injetada. */
  online: boolean;
  /** App DotBot rodando — só fica false com a camada swarmit ligada e o robô fora de Running. */
  appRunning: boolean;
  loop: boolean;
  pos_x: number;
  pos_y: number;
  theta: number;
  pwm_left: number; // -127..127
  pwm_right: number;
  encoder_left: number; // mm acumulados (com sinal)
  encoder_right: number;
  battery: number; // 0..100
  rgb: RgbColorModel;
  waypoints: Vec2Model[];
  waypoint_idx: number;
  waypoint_threshold: number; // mm
}

/** Robô no formato do mapa da Simulação — vem do cenário (Editar) ou do snapshot (Simular); ver `SimRobot.Mapper.ts`. */
export interface SimMapRobotModel {
  address: string;
  label: string;
  color: string;
  x: number; // mm
  y: number; // mm
  theta: number; // rad
  status: RobotStatus;
  rgb: RgbColorModel | null;
  mode: DotBotControlMode;
  waypoints: Vec2Model[];
  waypointIdx: number;
  loop: boolean;
}

/** Linha da lista de robôs do menu da Simulação (ver `SimRobotCard`). */
export interface SimRobotRowModel {
  address: string;
  label: string;
  color: string;
  modeLabel: string;
  battery: number;
  x: number;
  y: number;
  thetaDeg: number;
  waypoints: number;
  waypointIdx: number | null;
  loop: boolean;
  /** Só no modo Simular. */
  sim?: {
    online: boolean;
    appRunning: boolean;
    /** Status que o backend calcula pelo último DOTBOT_ADVERTISEMENT — null = não cadastrado. */
    backendStatus: RobotStatus | null;
    swarmitStatus: SwarmitDeviceStatus | null;
    /** Task em andamento no orquestrador do backend local, se houver. */
    taskName: string | null;
  };
}
