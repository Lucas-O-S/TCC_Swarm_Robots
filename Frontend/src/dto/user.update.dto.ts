import { z } from 'zod';

/**
 * Espelha `UserUpdateDto` do backend — só `username`, nunca senha por esta
 * rota (trocar senha é um fluxo à parte, ainda não implementado nem lá).
 */
export const userUpdateRequestSchema = z.object({
  username: z.string().min(1, 'O nome de usuário não pode ser vazio').optional(),
});

export type UserUpdateRequest = z.infer<typeof userUpdateRequestSchema>;
