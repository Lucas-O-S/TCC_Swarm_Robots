import type { PositionDto } from '../dto/position.dto';
import type { PositionCreateRequest } from '../dto/position.create.dto';
import type { PositionUpdateRequest } from '../dto/position.update.dto';
import type { PositionInput, PositionModel, PositionUpdateInput } from '../model/Position.Model';
import { compact } from './compact';

export const PositionMapper = {
  fromDto(dto: PositionDto): PositionModel {
    return {
      uuid: dto.uuid,
      robotId: dto.robotId,
      source: dto.source as PositionModel['source'],
      x: dto.x,
      y: dto.y,
      direction: dto.direction ?? null,
      createdAt: new Date(dto.createdAt),
      updatedAt: new Date(dto.updatedAt),
      isDeleted: dto.deletedAt != null,
    };
  },

  toCreateDto(input: PositionInput): PositionCreateRequest {
    return compact({
      robotId: input.robotId,
      source: input.source,
      x: input.x,
      y: input.y,
      direction: input.direction,
    });
  },

  toUpdateDto(input: PositionUpdateInput): PositionUpdateRequest {
    return compact({
      robotId: input.robotId,
      source: input.source,
      x: input.x,
      y: input.y,
      direction: input.direction,
    });
  },
};
