import { createBaseRepository } from './BaseRepository';
import { robotDtoSchema } from '../dto/robot.dto';
import type { RobotDto } from '../dto/robot.dto';

/**
 * Camada de acesso a dados dos robôs: só fala com a API via `Callout` e
 * devolve o `CalloutResult` cru, ainda em `RobotDto` (sem mapear pra `RobotModel`).
 */
export const RobotRepository = {
    ...createBaseRepository<RobotDto>('/robots', robotDtoSchema),
};