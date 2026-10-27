import { z } from 'zod';
import { robotCreateRequestSchema } from './robot.create.dto';

/**
 * Espelha `RobotUpdateDto` (= `PartialType(RobotCreateDto)`): mesmos campos do
 * create, todos opcionais. Única diferença: `taskId` também aceita `null`,
 * que é como se "solta" a task de um robô.
 */
export const robotUpdateRequestSchema = robotCreateRequestSchema.partial().extend({
  taskId: z.string().uuid('taskId deve ser um UUID válido').nullable().optional(),
});

export type RobotUpdateRequest = z.infer<typeof robotUpdateRequestSchema>;
