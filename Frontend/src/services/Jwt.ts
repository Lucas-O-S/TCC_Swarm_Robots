/**
 * Decodifica só o PAYLOAD de um JWT (a parte do meio, entre os dois
 * pontos) — NÃO valida a assinatura, isso é responsabilidade exclusiva do
 * backend a cada requisição autenticada. O front só lê o payload localmente
 * pra saber `username`/`sub` sem precisar de uma chamada extra a
 * `GET /auth/me` (ver `Auth.Mapper.ts`).
 *
 * JWT usa base64url (troca `+`/`/` por `-`/`_` e costuma omitir o padding
 * `=`), então não dá pra jogar direto no `atob` — precisa reverter isso
 * primeiro.
 */
export function decodeJwtPayload<T>(token: string): T {
  const payload = token.split('.')[1];
  if (!payload) throw new Error('Token JWT malformado (sem seção de payload).');

  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  const paddingNeeded = (4 - (base64.length % 4)) % 4;
  const padded = base64 + '='.repeat(paddingNeeded);

  return JSON.parse(atob(padded)) as T;
}
