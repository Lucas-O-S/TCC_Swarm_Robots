import { z } from 'zod';
import { taskWaypointDtoSchema } from './taskWaypoint.dto';

/** Robô associado — só o resumo que a tela de Tarefas precisa pra exibir. */
const taskRobotSummarySchema = z.object({
  uuid: z.string().uuid(),
  address: z.string(),
  name: z.string(),
});

/**
 * Espelha a forma exposta de `TaskModel` (+ `TaskWaypointModel` aninhado).
 *
 * `robots`/`waypoints` são opcionais/tolerantes: SUPOSIÇÃO de que
 * `GET /tasks` inclui as associações (`@HasMany`) por padrão — se o
 * backend não trouxer, chegam `undefined` e a UI trata como lista vazia
 * (ver `Task.Mapper.ts`). Mesma suposição de `deletedAt` de `robot.dto.ts`.
 */
export const taskDtoSchema = z.object({
  uuid: z.string().uuid(),
  name: z.string(),
  priority: z.number(),
  status: z.number(),
  waypoints: z.array(taskWaypointDtoSchema).optional(),
  robots: z.array(taskRobotSummarySchema).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export type TaskDto = z.infer<typeof taskDtoSchema>;
