import type { RobotStateDto } from '../dto/robot.state.dto';
import { PayloadType } from '../enums/PayloadType.enum';
import { PositionSource } from '../enums/PositionSource.enum';
import type { RobotPositionModel, RobotTelemetryModel } from '../model/RobotTelemetry.Model';
import type { RobotStateModel } from '../model/RobotState.Model';

/** pos_x/pos_y = 0xFFFFFFFF: o robô ainda não se localizou. */
const NO_POSITION = 0xffffffff;
/** direction = 0xFFFF no fio, que o decode com sinal entrega como -1: sem leitura. */
const NO_DIRECTION = -1;

const num = (value: unknown): number | null => (typeof value === 'number' ? value : null);

/**
 * Posição a partir do `data` cru — mesma regra do `positionOf` da borda
 * (Edge/server/src/Classes/Swarm/Swarm.Service.ts).
 */
function positionOf(payloadType: number, data: Record<string, unknown>): RobotPositionModel | null {
  if (payloadType === PayloadType.DOTBOT_ADVERTISEMENT) {
    const x = num(data.pos_x);
    const y = num(data.pos_y);
    if (x === null || y === null || x === NO_POSITION || y === NO_POSITION) return null;
    const direction = num(data.direction);
    return { source: PositionSource.LH2, x, y, direction: direction === NO_DIRECTION ? null : direction };
  }
  if (payloadType === PayloadType.GPS_POSITION) {
    const lat = num(data.latitude);
    const lon = num(data.longitude);
    if (lat === null || lon === null) return null;
    return { source: PositionSource.GPS, x: lat / 1e6, y: lon / 1e6, direction: null };
  }
  return null;
}

export const RobotStateMapper = {
  fromDto(dto: RobotStateDto): RobotStateModel {
    return {
      payloadType: dto.payloadType,
      data: dto.data,
      updatedAt: new Date(dto.updatedAt),
    };
  },

  /**
   * Estado cru do `GET /robots/:address/status` → mesmo formato do
   * `robot:update`. Enquanto o backend não devolver o `RobotUpdateEvent`
   * nessa rota, a tradução (sentinelas, mV → V) fica aqui.
   */
  toTelemetry(dto: RobotStateDto): RobotTelemetryModel {
    const battery = num(dto.data.battery);
    return {
      position: positionOf(dto.payloadType, dto.data),
      battery: battery === null ? null : battery / 1000,
      waypointIdx: num(dto.data.waypoint_idx),
      updatedAt: new Date(dto.updatedAt),
    };
  },
};
