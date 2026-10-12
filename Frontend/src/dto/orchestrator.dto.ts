import { z } from 'zod';

/**
 * Rotas do orquestrador (`src/Classes/Orchestrator/*`).
 *
 * `PUT /orchestrator/robots/:address/assign`  body `{ taskId }`  -> `{ address, taskId }`
 * `GET /orchestrator/auto`                                      -> `{ enabled }`
 * `PUT /orchestrator/auto`                    body `{ enabled }` -> `{ enabled }`
 */

/** Espelha `AssignTaskDto`. */
export const assignTaskRequestSchema = z.object({
  taskId: z
    .string({ required_error: 'taskId deve ser um UUID válido' })
    .uuid('taskId deve ser um UUID válido'),
});
export type AssignTaskRequest = z.infer<typeof assignTaskRequestSchema>;

export const assignTaskResponseSchema = z.object({
  address: z.string(),
  taskId: z.string().uuid(),
});
export type AssignTaskResponse = z.infer<typeof assignTaskResponseSchema>;

/** Espelha `AutoToggleDto`. */
export const autoToggleRequestSchema = z.object({
  enabled: z.boolean({
    required_error: 'enabled deve ser true ou false',
    invalid_type_error: 'enabled deve ser true ou false',
  }),
});
export type AutoToggleRequest = z.infer<typeof autoToggleRequestSchema>;

/** Resposta de `GET` e `PUT /orchestrator/auto`. */
export const autoStateResponseSchema = z.object({
  enabled: z.boolean(),
});
export type AutoStateResponse = z.infer<typeof autoStateResponseSchema>;
