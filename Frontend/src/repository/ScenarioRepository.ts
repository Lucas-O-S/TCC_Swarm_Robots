import { createBaseRepository } from './BaseRepository';
import { scenarioDtoSchema } from '../dto/scenario.dto';
import type { ScenarioDto } from '../dto/scenario.dto';
import type { ScenarioCreateRequest } from '../dto/scenario.create.dto';
import type { ScenarioUpdateRequest } from '../dto/scenario.update.dto';

/**
 * Rotas de `ScenarioController` (`/scenarios`): CRUD completo por uuid. Os
 * obstáculos NÃO têm rota própria: vão e voltam dentro do corpo do cenário
 * (`obstacles`). Devolve o `CalloutResult` cru, ainda em DTO (mm).
 */
export const ScenarioRepository = {
    ...createBaseRepository<ScenarioDto, ScenarioCreateRequest, ScenarioUpdateRequest>('/scenarios', scenarioDtoSchema),
};