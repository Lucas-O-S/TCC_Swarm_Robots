/**
 * Classificação ÚNICA de erros de comunicação com a API.
 *
 * Toda falha (rede caiu, timeout, 404, 400 de validação...) vira um destes
 * `ErrorKind`.
 */
export type ErrorKind =
  | 'network' // sem resposta do servidor (offline, CORS, servidor desligado)
  | 'timeout' // o servidor não respondeu a tempo
  | 'validation' // 400/422: o backend recusou os dados enviados
  | 'unauthorized' // 401: sem token ou token expirado/inválido
  | 'forbidden' // 403
  | 'not_found' // 404: recurso inexistente
  | 'conflict' // 409: ex.: username já em uso, robô já com task
  | 'server' // 5xx
  | 'invalid_response' // respondeu 2xx, mas fora do formato esperado
  | 'unknown';

/** Mensagens de fallback, usadas quando o backend não manda um detalhe em `error`. */
export const DEFAULT_ERROR_MESSAGES: Record<ErrorKind, string> = {
  network: 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
  timeout: 'O servidor demorou demais para responder. Tente novamente.',
  validation: 'Os dados enviados são inválidos.',
  unauthorized: 'Sessão expirada ou não autenticada. Faça login novamente.',
  forbidden: 'Você não tem permissão para esta ação.',
  not_found: 'Recurso não encontrado.',
  conflict: 'A operação conflita com o estado atual do recurso.',
  server: 'Erro interno no servidor. Tente novamente mais tarde.',
  invalid_response: 'Resposta da API fora do formato esperado.',
  unknown: 'Erro inesperado ao falar com o servidor.',
};

/** Status HTTP -> `ErrorKind`. Status 0 = nem chegou resposta (tratado em `Callout`). */
export function kindFromStatus(status: number): ErrorKind {
  if (status === 400 || status === 422) return 'validation';
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status >= 500) return 'server';
  return 'unknown';
}
