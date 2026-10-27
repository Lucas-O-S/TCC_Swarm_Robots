import type { z } from 'zod';
import { scenarioCreateRequestSchema } from './scenario.create.dto';

/**
 * `ScenarioUpdateDto` do backend = `PartialType(ScenarioCreateDto)`: mesmos
 * campos, todos opcionais. ATENÇÃO: se `obstacles` for enviado, o backend
 * SUBSTITUI a lista inteira (apaga as antigas e cria as novas).
 */
export const scenarioUpdateRequestSchema = scenarioCreateRequestSchema.partial();

export type ScenarioUpdateRequest = z.infer<typeof scenarioUpdateRequestSchema>;