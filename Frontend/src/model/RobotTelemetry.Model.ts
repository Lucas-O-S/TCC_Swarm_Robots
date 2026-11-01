import type { PositionSource } from '../enums/PositionSource.enum';

/**
 * Posição do robô já sem sentinela. LH2: x/y em mm (Y pra baixo, origem no
 * canto sup.-esq. — convenção do firmware, ver SimRobot.ts); GPS: x =
 * latitude, y = longitude, em graus.
 */
export interface RobotPositionModel {
  source: PositionSource;
  x: number;
  y: number;
  /** Graus na convenção do firmware: 0 = +Y do robô, positivo = horário (-90 = pra direita); null = sem leitura. */
  direction: number | null;
}

/**
 * Último estado de um robô, no formato do `robot:update` (backend
 * `RobotUpdateEvent`): posição tratada pela borda, bateria em Volts e o
 * waypoint atual. O `GET /robots/:address/status` ainda devolve o estado cru
 * e é convertido pra cá em `RobotStateMapper.toTelemetry`.
 */
export interface RobotTelemetryModel {
  /** null = payload sem posição ou robô ainda não localizado. */
  position: RobotPositionModel | null;
  /** Volts; null = payload sem bateria. */
  battery: number | null;
  waypointIdx: number | null;
  /** Quando o backend recebeu o frame. */
  updatedAt: Date;
}
