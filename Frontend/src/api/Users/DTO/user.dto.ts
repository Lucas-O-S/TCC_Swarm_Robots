import { z } from 'zod';

/**
 * Espelha a forma exposta de `UserModel` no backend
 * (`src/Model/User.Model.ts` + `Base.Model.ts`) — é o que vem em
 * `GET /users`, `GET /users/:uuid` e `PUT /users/:uuid`. `passwordHash`
 * nunca aparece aqui porque o `defaultScope` do backend já exclui esse
 * campo de toda resposta.
 *
 * Suposição a confirmar contra uma chamada real: `deletedAt` vem `null`
 * enquanto o usuário não foi removido (soft-delete via `paranoid: true`) —
 * se o backend simplesmente omitir o campo em vez de mandar `null`, ajuste
 * pra `.nullable().optional()`.
 */
export const userDtoSchema = z.object({
  uuid: z.string().uuid(),
  username: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export type UserDto = z.infer<typeof userDtoSchema>;
