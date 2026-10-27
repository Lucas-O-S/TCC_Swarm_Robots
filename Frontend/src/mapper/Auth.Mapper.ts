import { decodeJwtPayload } from '../services/Jwt';
import type { LoginRequest, LoginResponse } from '../dto/login.dto';
import type { AuthMeResponse } from '../dto/auth.me.dto';
import type { AuthSessionModel, AuthUserModel, LoginInput } from '../model/AuthSession.Model';

/** Formato do payload assinado pelo backend — ver `Auth.service.ts`, `jwtService.sign(payload)`. */
interface JwtPayload {
  username: string;
  sub: string;
}

export const AuthMapper = {
  fromLoginResponse(dto: LoginResponse): AuthSessionModel {
    const payload = decodeJwtPayload<JwtPayload>(dto.access_token);
    return {
      accessToken: dto.access_token,
      user: { uuid: payload.sub, username: payload.username },
    };
  },

  toLoginDto(input: LoginInput): LoginRequest {
    return { username: input.username, password: input.password };
  },

  /**
   * `GET /auth/me`: devolve o usuário, ou `null` quando o backend está com a
   * autenticação desligada (`AUTH_ACTIVATED=false` responde só `{ message }`).
   */
  fromMeResponse(dto: AuthMeResponse): AuthUserModel | null {
    return 'uuid' in dto ? { uuid: dto.uuid, username: dto.username } : null;
  },

  /** Reconstrói a sessão a partir de um token já guardado (ex.: ao recarregar a página). */
  fromStoredToken(token: string): AuthSessionModel {
    return AuthMapper.fromLoginResponse({ access_token: token });
  },
};