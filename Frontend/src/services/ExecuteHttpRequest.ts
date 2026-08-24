import axios from 'axios';
import type { AxiosError, AxiosResponse } from 'axios';

/**
 * Cliente HTTP genérico usado por qualquer `*Service` que vier a existir
 * (ex.: authService.login, robotService.list). Centraliza URL base, timeout
 * e o formato de erro — nenhuma tela deve chamar axios diretamente.
 */

const API_URL = import.meta.env.VITE_API_URL;

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

interface CalloutParams {
  url?: string;
  method?: HttpMethod;
  body?: unknown;
  param?: Record<string, unknown>;
  headers?: Record<string, string>;
}

/** Formato devolvido quando a requisição falha. */
interface HttpErrorResult {
  status: number;
  data: unknown;
}

export class ExecuteHttpRequest {
  static #baseUrl = API_URL;

  static async callout({
    url = '',
    method = 'GET',
    body = null,
    param = {},
    headers = {},
  }: CalloutParams = {}): Promise<AxiosResponse | HttpErrorResult> {
    try {
      const requestUrl = ExecuteHttpRequest.#baseUrl + url;
      const upperMethod = method.toUpperCase() as HttpMethod;
      const functionType = ExecuteHttpRequest.requestType[upperMethod];

      if (['GET', 'DELETE'].includes(upperMethod)) {
        return await functionType(requestUrl, {
          params: param,
          headers,
          timeout: 10000,
          responseType: 'json',
        });
      }

      return await functionType(requestUrl, body, {
        params: param,
        headers,
        timeout: 10000,
        responseType: 'json',
      });
    } catch (error) {
      const err = error as AxiosError;
      const status = err.response?.status ?? 0;
      const data = err.response?.data ?? {
        status: 0,
        message: err.message || 'Erro de requisição',
      };
      return { status, data };
    }
  }

  /**
   * Mapa método -> função do axios. GET/DELETE têm assinatura diferente de
   * POST/PUT/PATCH (sem/com body), por isso o tipo é permissivo aqui — quem
   * decide qual formato chamar é o `callout` acima.
   */
  static requestType: Record<HttpMethod, (...args: unknown[]) => Promise<AxiosResponse>> = {
    GET: axios.get as never,
    POST: axios.post as never,
    PATCH: axios.patch as never,
    PUT: axios.put as never,
    DELETE: axios.delete as never,
  };
}
