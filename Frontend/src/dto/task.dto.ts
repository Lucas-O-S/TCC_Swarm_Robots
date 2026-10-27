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
 * `robots`/`waypoints` são opcionais: `GET /tasks` e
 * `GET /tasks/:uuid` usam o `getAll`/`getOne` genérico do backend, SEM
 * `include` das associações — então chegam `undefined` e a UI trata como
 * lista vazia. Só o uso interno do Orchestrator carrega os waypoints.
 * `deletedAt`: tolerante (`nullish`) — o Sequelize (paranoid) manda `null`
 * enquanto a task existe. */
export const taskDtoSchema = z.object({
  uuid: z.string().uuid(),
  name: z.string(),
  priority: z.number(),
  status: z.number(),
  waypoints: z.array(taskWaypointDtoSchema).optional(),
  robots: z.array(taskRobotSummarySchema).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullish(),
});

export type TaskDto = z.infer<typeof taskDtoSchema>;