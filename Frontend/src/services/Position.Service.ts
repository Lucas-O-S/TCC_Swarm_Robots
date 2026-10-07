import { positionCreateRequestSchema } from '../dto/position.create.dto';
import { positionUpdateRequestSchema } from '../dto/position.update.dto';
import { PositionMapper } from '../mapper/Position.Mapper';
import type { PositionInput, PositionModel, PositionUpdateInput } from '../model/Position.Model';
import { PositionRepository } from '../repository/PositionRepository';
import { fromList, fromUnit, fromVoid, parseRequest } from './ServiceResult';
import type { ServiceResult } from './ServiceResult';

/** Histórico de posição dos robôs (`/positions`). Normalmente gravado pelo backend; o CRUD existe pra consulta/ajuste. */
export const PositionService = {
  async list(): Promise<ServiceResult<PositionModel[]>> {
    return fromList(await PositionRepository.findAll(), PositionMapper.fromDto);
  },

  async getByUuid(uuid: string): Promise<ServiceResult<PositionModel>> {
    return fromUnit(await PositionRepository.findByUuid(uuid), PositionMapper.fromDto);
  },

  async create(input: PositionInput): Promise<ServiceResult<PositionModel>> {
    const body = parseRequest(positionCreateRequestSchema, PositionMapper.toCreateDto(input));
    if (!body.ok) return body;
    return fromUnit(await PositionRepository.create(body.data), PositionMapper.fromDto);
  },

  async update(uuid: string, input: PositionUpdateInput): Promise<ServiceResult<PositionModel>> {
    const body = parseRequest(positionUpdateRequestSchema, PositionMapper.toUpdateDto(input));
    if (!body.ok) return body;
    return fromUnit(await PositionRepository.update(uuid, body.data), PositionMapper.fromDto);
  },

  async remove(uuid: string): Promise<ServiceResult<void>> {
    return fromVoid(await PositionRepository.remove(uuid));
  },
};
