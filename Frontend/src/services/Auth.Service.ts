import { Callout } from '../Integration/Callout';
import { loginRequestSchema } from '../dto/login.dto';
import { AuthMapper } from '../mapper/Auth.Mapper';
import type { AuthSessionModel, AuthUserModel, LoginInput } from '../model/AuthSession.Model';
import { AuthRepository } from '../repository/AuthRepository';
import { AuthTokenStorage } from './AuthTokenStorage';
import { failure, fromUnit, parseRequest, success } from './ServiceResult';
import type { ServiceResult } from './ServiceResult';

/**
 * Sessão do usuário: login, logout, restaurar o token após F5 e consultar
 * `/auth/me`. É o ÚNICO lugar que mexe no token — as telas só chamam
 * `login`/`logout`; o `Callout` passa a enviar o `Authorization: Bearer`
 * sozinho a partir daí.
 */
export const AuthService = {
  /**
   * Chamar UMA vez na inicialização do app (`main.tsx`):
   *  1. registra o que fazer quando a API responder 401 com sessão ativa
   *     (token expirou): limpa a sessão e avisa a UI via `onSessionExpired`;
   *  2. restaura o token guardado (se houver) pra recarregar a página não deslogar.
   */
  init(options: { onSessionExpired?: () => void } = {}): AuthSessionModel | null {
    Callout.setUnauthorizedHandler(() => {
      AuthService.logout();
      options.onSessionExpired?.();
    });
    return AuthService.restoreSession();
  },

  /** Lê o token guardado e religa o header. Token ilegível = descarta (nunca lança). */
  restoreSession(): AuthSessionModel | null {
    const token = AuthTokenStorage.get();
    if (!token) return null;

    try {
      const session = AuthMapper.fromStoredToken(token);
      Callout.setAuthToken(token);
      return session;
    } catch {
      AuthService.logout();
      return null;
    }
  },

  async login(input: LoginInput): Promise<ServiceResult<AuthSessionModel>> {
    const body = parseRequest(loginRequestSchema, AuthMapper.toLoginDto(input));
    if (!body.ok) return body;

    const response = fromUnit(await AuthRepository.login(body.data), (dto) => dto);
    if (!response.ok) return response;

    try {
      const session = AuthMapper.fromLoginResponse(response.data);
      AuthTokenStorage.set(session.accessToken);
      Callout.setAuthToken(session.accessToken);
      return success(session);
    } catch {
      return failure('invalid_response', 'O servidor devolveu um token de acesso inválido.');
    }
  },

  logout(): void {
    AuthTokenStorage.clear();
    Callout.setAuthToken(null);
  },

  /** `null` quando o backend está com a autenticação desligada (não há usuário no request). */
  async me(): Promise<ServiceResult<AuthUserModel | null>> {
    return fromUnit(await AuthRepository.me(), AuthMapper.fromMeResponse);
  },
};
