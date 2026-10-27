import { z } from 'zod';

/**
 * Espelha `PositionModel` (`src/Model/Position.Model.ts`): uma amostra do
 * histórico de posição de um robô (`GET /positions`, `GET /positions/:uuid`).
 *
 * `x`/`y` dependem de `source`: LH2 = milímetros; GPS = latitude/longitude em
 * graus decimais. `direction` é opcional (`allowNull`), por isso `nullish`.
 */
export const positionDtoSchema = z.object({
  uuid: z.string().uuid(),
  robotId: z.string().uuid(),
  source: z.number(),
  x: z.number(),
  y: z.number(),
  direction: z.number().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullish(),
});

export type PositionDto = z.infer<typeof positionDtoSchema>;
