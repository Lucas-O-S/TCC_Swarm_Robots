import { createBaseRepository } from './BaseRepository';
import { positionDtoSchema } from '../dto/position.dto';
import type { PositionDto } from '../dto/position.dto';
import type { PositionCreateRequest } from '../dto/position.create.dto';
import type { PositionUpdateRequest } from '../dto/position.update.dto';

/** Rotas de `PositionController` (`/positions`): CRUD completo (histórico de posição). */
export const PositionRepository = {
    ...createBaseRepository<PositionDto, PositionCreateRequest, PositionUpdateRequest>(
        '/positions',
        positionDtoSchema,
    ),
};
