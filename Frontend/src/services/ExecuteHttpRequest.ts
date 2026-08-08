import axios from 'axios';
import type { AxiosError, AxiosResponse } from 'axios';

/**
 * Adaptado de utils/ExecuteHttpRequest.js (GameHitMobile) para TypeScript + Vite.
 *
 * Diferenças em relação ao original:
 *  - A URL base vem de import.meta.env.VITE_API_URL (Vite) no lugar do
 *    `import { API_URL } from '@env'` (React Native).
 *  - Tipagem dos parâmetros, do retorno e do erro.
 * O comportamento é o mesmo: monta a URL, escolhe o método pelo mapa
 * `requestType`, separa GET/DELETE (sem body) dos demais (com body), e no
 * catch devolve `{ status, data }` no mesmo formato do envelope da API.
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

/** Shape devolvido quando a requisição falha (igual ao original). */
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
      console.log(requestUrl);

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

      console.log('Erro na requisição:', status, data);

      return { status, data };
    }
  }

  /**
   * Mapa método -> função do axios. Os métodos do axios têm assinaturas
   * diferentes (get/delete recebem config; post/put/patch recebem body +
   * config), por isso o valor é tipado de forma permissiva para o `callout`
   * poder chamar qualquer um deles com os dois formatos, como no original.
   */
  static requestType: Record<
    HttpMethod,
    (...args: unknown[]) => Promise<AxiosResponse>
  > = {
    GET: axios.get as never,
    POST: axios.post as never,
    PATCH: axios.patch as never,
    PUT: axios.put as never,
    DELETE: axios.delete as never,
  };
}
