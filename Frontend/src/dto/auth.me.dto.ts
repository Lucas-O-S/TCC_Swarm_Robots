import { z } from 'zod';

/**
 * `GET /auth/me` (`Auth.controller.ts`) tem DUAS formas de resposta:
 *
 *  - auth ligada (`AUTH_ACTIVATED=true`): `{ uuid, username }` (o que o
 *    `JwtStrategy.validate` colocou em `req.user`);
 *  - auth desligada: `{ message: "Auth desativada ... " }` — não há usuário.
 *
 * Por isso o schema é uma união; o `AuthMapper.fromMeResponse` devolve `null`
 * no segundo caso.
 */
export const authMeResponseSchema = z.union([
  z.object({ uuid: z.string().uuid(), username: z.string() }),
  z.object({ message: z.string() }),
]);

export type AuthMeResponse = z.infer<typeof authMeResponseSchema>;
