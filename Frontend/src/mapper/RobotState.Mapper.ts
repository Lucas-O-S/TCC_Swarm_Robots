import type { RobotStateDto } from '../dto/robot.state.dto';
import type { RobotStateModel } from '../model/RobotState.Model';

export const RobotStateMapper = {
  fromDto(dto: RobotStateDto): RobotStateModel {
    return {
      payloadType: dto.payloadType,
      data: dto.data,
      updatedAt: new Date(dto.updatedAt),
    };
  },
};
