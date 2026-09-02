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
 * Corpo enviado ao criar/atualizar os waypoints de uma task — só `x`/`y`,
 * na ordem da lista (o `orderIndex` fica implícito pelo índice do array).
 *
 * SUPOSIÇÃO (não confirmada contra o `TaskController` real): assumimos que
 * o create/update de task aceita uma lista de pontos nesse formato. Só o
 * modo "rota" do `RouteEditor` vira isso — "área" não tem correspondente
 * no backend (ver `screens/tasks/utils/routeWaypoints.ts`).
 */
export const taskWaypointInputSchema = z.object({
  x: z.number().int().min(0, 'x deve ser no mínimo 0'),
  y: z.number().int().min(0, 'y deve ser no mínimo 0'),
});

export type TaskWaypointInput = z.infer<typeof taskWaypointInputSchema>;
