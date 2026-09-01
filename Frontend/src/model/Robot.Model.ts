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
