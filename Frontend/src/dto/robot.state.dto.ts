import { z } from 'zod';

/**
 * Espelha `RobotState` do `SwarmService` (backend) — o último frame
 * decodificado que chegou do robô, guardado em MEMÓRIA (não vem do banco):
 * `GET /robots/:address/status`.
 */
export const robotStateDtoSchema = z.object({
  payloadType: z.number(),
  data: z.record(z.string(), z.unknown()),
  updatedAt: z.string(),
});

export type RobotStateDto = z.infer<typeof robotStateDtoSchema>;
