import { z } from 'zod';

/**
 * Espelha a forma exposta de `RobotModel` no backend (`Robot.Model.ts` +
 * `Base.Model.ts`) — é o que vem em `GET /robots` e `GET /robots/:uuid`.
 *
 * `battery` vem em **Volts** (o model do backend já guarda convertido — "o
 * protocolo manda em mV; converta ao gravar", ver comentário lá). A UI
 * converte pra percentual só na hora de exibir — ver `Robot.Mapper.ts`.
 *
 * SUPOSIÇÃO: `deletedAt` vem `null` enquanto o robô não foi removido
 * (soft-delete via `paranoid: true`); se o backend omitir o campo em vez
 * de mandar `null`, trocar para `.nullable().optional()`.
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
  deletedAt: z.string().nullable(),
});

export type RobotDto = z.infer<typeof robotDtoSchema>;
