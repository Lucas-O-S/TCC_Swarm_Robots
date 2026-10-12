import type { RobotApplication } from '../enums/RobotApplication.enum';
import type { RobotControlMode } from '../enums/RobotControlMode.enum';
import type { RobotStatus } from '../enums/RobotStatus.enum';

/**
 * Robô no formato usado pela UI — só a tradução direta do DTO (datas como
 * `Date`, sem nenhuma decisão de tela ainda). A junção com o nome da task
 * atual e a conversão de bateria pra percentual ficam em
 * `screens/robots/hooks/useRobots.ts` / `types.ts` (formato específico
 * daquela tela).
 */
export interface RobotModel {
  uuid: string;
  address: string;
  name: string;
  application: RobotApplication;
  swarmId: string;
  status: RobotStatus;
  mode: RobotControlMode;
  calibrated: number;
  /** Volts — ver `Robot.Mapper.ts` pra conversão em percentual. */
  battery: number;
  waypointsThreshold: number;
  lastSync: Date;
  taskId: string | null;
  isDeleted: boolean;
}

/** Dados pra registrar um robô (`POST /robots`). Só `address` e `name` são obrigatórios. */
export interface RobotInput {
  address: string;
  name: string;
  application?: RobotApplication;
  mode?: RobotControlMode;
  swarmId?: string;
  waypointsThreshold?: number;
  taskId?: string;
  status?: RobotStatus;
}

/** Edição parcial (`PUT /robots/:uuid`). `taskId: null` solta a task do robô. */
export type RobotUpdateInput = Partial<Omit<RobotInput, 'taskId'>> & { taskId?: string | null };

/** Joystick. Cada eixo vai de -128 a 127. */
export interface RobotMoveInput {
  leftX: number;
  leftY: number;
  rightX: number;
  rightY: number;
}

/** Cor do LED RGB. Cada canal vai de 0 a 255. */
export interface RobotRgbInput {
  red: number;
  green: number;
  blue: number;
}

/** Rota LH2 pro robô seguir (coordenadas em mm). */
export interface RobotWaypointsInput {
  /** Distância (mm) pra considerar que chegou num waypoint. */
  threshold: number;
  waypoints: { x: number; y: number }[];
}

/** Recibo de um comando enviado ao robô (`PUT /robots/:address/<comando>`). */
export interface RobotCommandReceiptModel {
  address: string;
  command: string;
  payload: Record<string, unknown>;
}