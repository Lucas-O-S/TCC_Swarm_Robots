import { z } from 'zod';

/** Espelha `LoginDto` do backend (`src/Auth/DTO/login.dto.ts`). */
export const loginRequestSchema = z.object({
  username: z.string().min(1, 'O nome de usuário não pode ser vazio'),
  password: z.string().min(1, 'A senha não pode ser vazia'),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

/**
 * Espelha o retorno de `AuthService.login` no backend
 * (`src/Auth/Auth.service.ts`) — só o token, sem dados do usuário (por
 * isso o `AuthMapper` do front extrai `username`/`sub` de dentro do
 * próprio JWT em vez de esperar isso no corpo da resposta).
 */
export const loginResponseSchema = z.object({
  access_token: z.string(),
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;
