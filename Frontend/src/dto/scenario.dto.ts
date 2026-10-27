import { z } from 'zod';
import { obstacleDtoSchema } from './obstacle.dto';

/**
 * Espelha `ScenarioModel` do backend (`GET /scenarios`, `GET /scenarios/:uuid`).
 * `sizeX`/`sizeY` em **milímetros**. `obstacles` já vem junto (o
 * `ScenarioRepository` do backend faz `include`), mas fica opcional por
 * tolerância. `description` é `allowNull`, por isso `nullish`.
 */
export const scenarioDtoSchema = z.object({
  uuid: z.string().uuid(),
  name: z.string(),
  description: z.string().nullish(),
  sizeX: z.number(),
  sizeY: z.number(),
  obstacles: z.array(obstacleDtoSchema).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullish(),
});

export type ScenarioDto = z.infer<typeof scenarioDtoSchema>;