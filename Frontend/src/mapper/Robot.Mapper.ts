import type { RobotDto } from '../dto/robot.dto';
import type { RobotCreateRequest } from '../dto/robot.create.dto';
import type { RobotUpdateRequest } from '../dto/robot.update.dto';
import type {
  RobotCommandReceiptDto,
  RobotControlModeRequest,
  RobotMoveRawRequest,
  RobotRgbLedRequest,
  RobotWaypointsRequest,
  RobotXgoActionRequest,
} from '../dto/robot.command.dto';
import type {
  RobotCommandReceiptModel,
  RobotInput,
  RobotModel,
  RobotMoveInput,
  RobotRgbInput,
  RobotUpdateInput,
  RobotWaypointsInput,
} from '../model/Robot.Model';
import type { RobotControlMode } from '../enums/RobotControlMode.enum';
import { compact } from './compact';

export const RobotMapper = {
  // API -> domínio
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
      taskId: dto.taskId ?? null,
      isDeleted: dto.deletedAt != null,
    };
  },

  commandReceiptFromDto(dto: RobotCommandReceiptDto): RobotCommandReceiptModel {
    return { address: dto.address, command: dto.command, payload: dto.payload };
  },

  // domínio -> API
  /**
   * O backend guarda o `address` SEMPRE em maiúsculas (constraint no banco +
   * `Protocol.normalizeAddress`). Normalizamos aqui também pra URL/corpo já
   * saírem no formato canônico.
   */
  normalizeAddress(address: string): string {
    return address.trim().toUpperCase();
  },

  toCreateDto(input: RobotInput): RobotCreateRequest {
    return compact({
      address: RobotMapper.normalizeAddress(input.address),
      name: input.name,
      application: input.application,
      mode: input.mode,
      swarmId: input.swarmId,
      waypointsThreshold: input.waypointsThreshold,
      taskId: input.taskId,
      status: input.status,
    });
  },

  toUpdateDto(input: RobotUpdateInput): RobotUpdateRequest {
    return compact({
      address: input.address === undefined ? undefined : RobotMapper.normalizeAddress(input.address),
      name: input.name,
      application: input.application,
      mode: input.mode,
      swarmId: input.swarmId,
      waypointsThreshold: input.waypointsThreshold,
      taskId: input.taskId,
      status: input.status,
    });
  },

  /** O domínio usa camelCase; o protocolo do robô, snake_case (`left_x`). */
  toMoveRawDto(input: RobotMoveInput): RobotMoveRawRequest {
    return { left_x: input.leftX, left_y: input.leftY, right_x: input.rightX, right_y: input.rightY };
  },

  toRgbLedDto(input: RobotRgbInput): RobotRgbLedRequest {
    return { red: input.red, green: input.green, blue: input.blue };
  },

  toControlModeDto(mode: RobotControlMode): RobotControlModeRequest {
    return { mode };
  },

  toWaypointsDto(input: RobotWaypointsInput): RobotWaypointsRequest {
    return {
      threshold: input.threshold,
      waypoints: input.waypoints.map((point) => ({ x: point.x, y: point.y })),
    };
  },

  toXgoActionDto(action: number): RobotXgoActionRequest {
    return { action };
  },

  // apresentação
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