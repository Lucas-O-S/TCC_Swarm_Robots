import { z } from 'zod';
import { PositionSource } from '../enums/PositionSource.enum';
import { enumValueSchema } from './enumSchema';

/** Espelha `PositionCreateDto` (`src/Classes/Positions/DTO/position.create.dto.ts`). */
export const positionCreateRequestSchema = z.object({
  robotId: z
    .string({ required_error: 'robotId não pode ser vazio' })
    .uuid('robotId deve ser um UUID válido'),
  source: enumValueSchema(PositionSource, 'source inválido').optional(),
  x: z.number({ required_error: 'x deve ser um número', invalid_type_error: 'x deve ser um número' }),
  y: z.number({ required_error: 'y deve ser um número', invalid_type_error: 'y deve ser um número' }),
  direction: z.number().int('direction deve ser um número inteiro').optional(),
});

export type PositionCreateRequest = z.infer<typeof positionCreateRequestSchema>;
