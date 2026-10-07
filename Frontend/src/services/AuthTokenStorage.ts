/**
 * Guarda o JWT no `localStorage` pra sessão sobreviver a um F5.
 *
 * Todo acesso é protegido por try/catch: o navegador pode bloquear o storage
 * (modo privado, política de cookies) e isso NUNCA deve derrubar o app — no
 * pior caso o usuário só precisa logar de novo a cada carregamento.
 */
const STORAGE_KEY = 'swarm.accessToken';

export const AuthTokenStorage = {
  get(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  },

  set(token: string): void {
    try {
      localStorage.setItem(STORAGE_KEY, token);
    } catch {
      // storage indisponível: a sessão só dura até recarregar a página.
    }
  },

  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
    }
  },
};
