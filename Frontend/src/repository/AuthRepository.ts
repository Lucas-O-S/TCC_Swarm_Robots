import { Callout } from '../Integration/Callout';
import type { CalloutResult } from '../Integration/Callout';
import { loginResponseSchema } from '../dto/login.dto';
import type { LoginRequest, LoginResponse } from '../dto/login.dto';
import { authMeResponseSchema } from '../dto/auth.me.dto';
import type { AuthMeResponse } from '../dto/auth.me.dto';

/**
 * Rotas de `AuthController` (`/auth`): login e "quem sou eu".
 * (`POST /auth/register` fica no `UserRepository`, porque cria um usuário.)
 */
export const AuthRepository = {
    /** `POST /auth/login` -> `{ access_token }` (200). Credenciais erradas = 401. */
    login(body: LoginRequest): Promise<CalloutResult<LoginResponse>> {
        return Callout.post('/auth/login', body, loginResponseSchema);
    },

    /** `GET /auth/me` (exige o token). */
    me(): Promise<CalloutResult<AuthMeResponse>> {
        return Callout.get('/auth/me', authMeResponseSchema);
    },
};
