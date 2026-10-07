import { z } from 'zod';
import { RobotApplication } from '../enums/RobotApplication.enum';
import { RobotControlMode } from '../enums/RobotControlMode.enum';
import { enumValueSchema } from './enumSchema';

/**
 * Espelha `RobotCreateDto` (`src/Classes/Robots/DTO/robot.create.dto.ts`).
 * As mensagens são as mesmas do `class-validator` de lá.
 *
 * O backend usa `forbidNonWhitelisted`: qualquer campo FORA desta lista
 * resulta em 400. Por isso o `RobotMapper.toCreateDto` só monta estes campos.
 * `lastSync` não entra: é gerido pelo backend.
 */
export const robotCreateRequestSchema = z.object({
  address: z
    .string({ required_error: 'O endereço não pode ser vazio' })
    .trim()
    .min(1, 'O endereço não pode ser vazio')
    .max(16, 'O endereço deve ter no máximo 16 caracteres'),
  name: z
    .string({ required_error: 'O nome não pode ser vazio' })
    .min(1, 'O nome não pode ser vazio'),
  application: enumValueSchema(RobotApplication, 'Aplicação inválida').optional(),
  mode: enumValueSchema(RobotControlMode, 'mode deve ser 0 (Manual), 1 (Auto) ou 2 (SemiAuto)').optional(),
  swarmId: z.string().max(8, 'O swarmId deve ter no máximo 8 caracteres').optional(),
  waypointsThreshold: z
    .number()
    .int('waypointsThreshold deve ser um número inteiro')
    .min(1, 'waypointsThreshold deve ser maior que zero')
    .optional(),
  taskId: z.string().uuid('taskId deve ser um UUID válido').optional(),
  status: z.number().int('status deve ser inteiro').optional(),
});

export type RobotCreateRequest = z.infer<typeof robotCreateRequestSchema>;
