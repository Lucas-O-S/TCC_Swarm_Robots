import { z } from 'zod';
import { taskCreateRequestSchema } from './task.create.dto';

/** Mesmos campos do create, todos opcionais — usado tanto pra editar a rota
 * (só `waypoints`) quanto por qualquer outro update parcial de task. */
export const taskUpdateRequestSchema = taskCreateRequestSchema.partial();
export type TaskUpdateRequest = z.infer<typeof taskUpdateRequestSchema>;
