import { z } from 'zod';
import { taskWaypointInputSchema } from './taskWaypoint.dto';
import { taskDtoSchema } from './task.dto';

/**
 * SUPOSIÇÃO (o `TaskCreateDto` real do backend não foi confirmado nesta
 * sessão): `name` obrigatório, `priority` opcional (`@Default(0)` no
 * model) e `waypoints` opcional. `status` **não** entra aqui de propósito
 * — é gerido pelo Orchestrator (Pending no create, InProgress/Completed
 * por automação), mesmo padrão de `RobotCreateDto` não aceitar campos
 * calculados.
 */
export const taskCreateRequestSchema = z.object({
  name: z.string().min(1, 'O nome não pode ser vazio'),
  priority: z.number().int().min(0, 'priority deve ser no mínimo 0').optional(),
  waypoints: z.array(taskWaypointInputSchema).optional(),
});

export type TaskCreateRequest = z.infer<typeof taskCreateRequestSchema>;

/** `POST /tasks` devolve a task recém-criada, no mesmo formato de `GET /tasks/:uuid`. */
export const taskCreateResponseSchema = taskDtoSchema;
export type TaskCreateResponse = z.infer<typeof taskCreateResponseSchema>;
