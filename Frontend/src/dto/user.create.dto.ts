import { z } from 'zod';

/**
 * Espelha `UserCreateDto` do backend
 * (`src/Classes/Users/DTO/user.create.dto.ts`) — as mensagens de validação
 * abaixo são as mesmas do `class-validator` de lá, só que checadas no front
 * também, pra dar feedback antes de gastar uma chamada de rede.
 */
export const userCreateRequestSchema = z.object({
  username: z.string().min(1, 'O nome de usuário não pode ser vazio'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
});

export type UserCreateRequest = z.infer<typeof userCreateRequestSchema>;

/**
 * `POST /auth/register` (ver `Auth.controller.ts`) não devolve o
 * `UserModel` inteiro — só isso, de propósito (o backend monta a resposta
 * manualmente ali: `{ uuid: user.uuid, username: user.username }`).
 */
export const userCreateResponseSchema = z.object({
  uuid: z.string().uuid(),
  username: z.string(),
});

export type UserCreateResponse = z.infer<typeof userCreateResponseSchema>;
