import type { z } from 'zod';
import { positionCreateRequestSchema } from './position.create.dto';

/** Espelha `PositionUpdateDto` (= `PartialType(PositionCreateDto)`). */
export const positionUpdateRequestSchema = positionCreateRequestSchema.partial();
export type PositionUpdateRequest = z.infer<typeof positionUpdateRequestSchema>;
