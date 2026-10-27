import { z } from 'zod';
import { taskDtoSchema } from './task.dto';

/**
 * Espelha `TaskCreateDto` do backend: `name` obrigatório e
 * `priority` inteiro >= 0 opcional. NÃO aceita `waypoints` nem `status`: o
 * ValidationPipe do backend usa `forbidNonWhitelisted`, então qualquer campo
 * extra devolveria 400. `status` é gerido pelo Orchestrator.
 */
export const taskCreateRequestSchema = z.object({
  name: z.string().min(1, 'O nome não pode ser vazio'),
  priority: z.number().int().min(0, 'priority deve ser no mínimo 0').optional(),
});

export type TaskCreateRequest = z.infer<typeof taskCreateRequestSchema>;

/** `POST /tasks` devolve a task recém-criada, no mesmo formato de `GET /tasks/:uuid`. */
export const taskCreateResponseSchema = taskDtoSchema;
export type TaskCreateResponse = z.infer<typeof taskCreateResponseSchema>;