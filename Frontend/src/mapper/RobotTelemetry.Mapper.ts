import type { RobotUpdateEventDto } from '../dto/robot.socket.dto';
import type { PositionSource } from '../enums/PositionSource.enum';
import type { RobotTelemetryModel } from '../model/RobotTelemetry.Model';

export const RobotTelemetryMapper = {
  /** `robot:update` → telemetria (o backend já manda nas unidades do model). */
  fromUpdateEvent(dto: RobotUpdateEventDto): RobotTelemetryModel {
    return {
      position: dto.position
        ? {
            source: dto.position.source as PositionSource,
            x: dto.position.x,
            y: dto.position.y,
            direction: dto.position.direction,
          }
        : null,
      battery: dto.battery,
      waypointIdx: dto.waypointIdx,
      updatedAt: new Date(dto.updatedAt),
    };
  },
};
