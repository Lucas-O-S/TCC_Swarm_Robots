import type { RobotDto } from '../dto/robot.dto';
import type { RobotModel } from '../model/Robot.Model';

export const RobotMapper = {
  fromDto(dto: RobotDto): RobotModel {
    return {
      uuid: dto.uuid,
      address: dto.address,
      name: dto.name,
      application: dto.application as RobotModel['application'],
      swarmId: dto.swarmId,
      status: dto.status as RobotModel['status'],
      mode: dto.mode as RobotModel['mode'],
      calibrated: dto.calibrated,
      battery: dto.battery,
      waypointsThreshold: dto.waypointsThreshold,
      lastSync: new Date(dto.lastSync),
      taskId: dto.taskId,
      isDeleted: dto.deletedAt !== null,
    };
  },

  /**
   * Volts -> percentual pra `BatteryBar`. O backend só expõe a tensão
   * (`RobotModel.battery`); a UI precisa de 0–100%.
   *
   * SUPOSIÇÃO: LiPo 1S (3.0V vazia / 4.2V cheia — mesma faixa do `@Default`
   * do model no backend). Ajustar se o hardware usar outra química/faixa.
   */
  batteryToPercent(volts: number): number {
    const MIN_V = 3.0;
    const MAX_V = 4.2;
    const pct = ((volts - MIN_V) / (MAX_V - MIN_V)) * 100;
    return Math.max(0, Math.min(100, Math.round(pct)));
  },
};
