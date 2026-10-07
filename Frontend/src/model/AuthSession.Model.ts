/**
 * Sessão autenticada usada pela UI — além do token, já traz os dados do
 * usuário extraídos do próprio JWT (`username`/`sub`, ver payload montado
 * em `Auth.service.ts` no backend), evitando uma chamada extra a
 * `GET /auth/me` só pra saber quem logou.
 */
export interface AuthSessionModel {
  accessToken: string;
  user: AuthUserModel;
}

export interface AuthUserModel {
  uuid: string;
  username: string;
}

/** Credenciais digitadas na tela de login. */
export interface LoginInput {
  username: string;
  password: string;
}