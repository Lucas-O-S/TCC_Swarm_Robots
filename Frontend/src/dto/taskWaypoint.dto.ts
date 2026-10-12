import { z } from 'zod';

/** Espelha `TaskWaypointModel` do backend — um ponto já persistido, com ordem. */
export const taskWaypointDtoSchema = z.object({
  uuid: z.string().uuid().optional(),
  orderIndex: z.number(),
  x: z.number(),
  y: z.number(),
});

export type TaskWaypointDto = z.infer<typeof taskWaypointDtoSchema>;

/**
 * Formato de um ponto (`x`/`y` inteiros em mm) para quando o backend ganhar uma
 * rota de waypoints. HOJE NÃO É USADO: `POST/PUT /tasks` só aceitam `name` e
 * `priority` (ver `task.create.dto.ts`).
 */
export const taskWaypointInputSchema = z.object({
  x: z.number().int().min(0, 'x deve ser no mínimo 0'),
  y: z.number().int().min(0, 'y deve ser no mínimo 0'),
});

export type TaskWaypointInput = z.infer<typeof taskWaypointInputSchema>;