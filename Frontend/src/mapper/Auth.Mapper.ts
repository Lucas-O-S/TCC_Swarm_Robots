import { decodeJwtPayload } from '../services/Jwt';
import type { LoginResponse } from '../dto/login.dto';
import type { AuthSessionModel } from '../model/AuthSession.Model';

/** Formato do payload assinado pelo backend — ver `Auth.service.ts`, `jwtService.sign(payload)`. */
interface JwtPayload {
  username: string;
  sub: string; // uuid do usuário — nome de campo padrão de JWT pra "subject"
}

export const AuthMapper = {
  fromLoginResponse(dto: LoginResponse): AuthSessionModel {
    const payload = decodeJwtPayload<JwtPayload>(dto.access_token);
    return {
      accessToken: dto.access_token,
      user: { uuid: payload.sub, username: payload.username },
    };
  },

  /** Reconstrói a sessão a partir de um token já guardado (ex.: ao recarregar a página). */
  fromStoredToken(token: string): AuthSessionModel {
    return AuthMapper.fromLoginResponse({ access_token: token });
  },
};