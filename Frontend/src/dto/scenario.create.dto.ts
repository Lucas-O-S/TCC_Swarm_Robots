import { z } from 'zod';
import { obstacleInputSchema } from './obstacle.dto';
import { scenarioDtoSchema } from './scenario.dto';

/**
 * Espelha `ScenarioCreateDto` do backend: `name` obrigatório; `sizeX`/`sizeY`
 * inteiros >= 1 (mm); `description` e `obstacles` opcionais.
 */
export const scenarioCreateRequestSchema = z.object({
  name: z.string().min(1, 'O nome não pode ser vazio'),
  description: z.string().optional(),
  sizeX: z.number().int('sizeX deve ser um número inteiro').min(1, 'sizeX deve ser no mínimo 1'),
  sizeY: z.number().int('sizeY deve ser um número inteiro').min(1, 'sizeY deve ser no mínimo 1'),
  obstacles: z.array(obstacleInputSchema).optional(),
});

export type ScenarioCreateRequest = z.infer<typeof scenarioCreateRequestSchema>;

/** `POST /scenarios` devolve o cenário criado, no mesmo formato de `GET /scenarios/:uuid`. */
export const scenarioCreateResponseSchema = scenarioDtoSchema;