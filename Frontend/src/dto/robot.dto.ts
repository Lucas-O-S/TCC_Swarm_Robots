import { z } from 'zod';

/**
 * Espelha a forma exposta de `RobotModel` no backend (`Robot.Model.ts` +
 * `Base.Model.ts`) — é o que vem em `GET /robots` e `GET /robots/:uuid`.
 *
 * `battery` vem em **Volts** (o model do backend já guarda convertido). A UI
 * converte pra percentual só na hora de exibir — ver `Robot.Mapper.ts`.
 *
 * `deletedAt` (confirmado: `paranoid: true` + `@DeletedAt`) vem `null` enquanto o
 * robô existe; o schema também aceita ausência (`nullish`).
 */

export const robotDtoSchema = z.object({
  uuid: z.string().uuid(),
  address: z.string(),
  name: z.string(),
  application: z.number(),
  swarmId: z.string(),
  status: z.number(),
  mode: z.number(),
  calibrated: z.number(),
  battery: z.number(),
  waypointsThreshold: z.number(),
  lastSync: z.string(),
  taskId: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullish(),
});

export type RobotDto = z.infer<typeof robotDtoSchema>;