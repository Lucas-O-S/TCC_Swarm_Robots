import axios from 'axios';
import type { AxiosError, AxiosRequestConfig } from 'axios';
import type { z } from 'zod';
import type { ApiEnvelope } from '../services/ApiEnvelope';
import { parseApiEnvelope } from '../services/ApiEnvelope';
import { DEFAULT_ERROR_MESSAGES, kindFromStatus } from './ApiError';
import type { ErrorKind } from './ApiError';

const API_URL = import.meta.env.VITE_API_URL;

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface CalloutParams<TBody = unknown> {
    url?: string;
    method?: HttpMethod;
    body?: TBody;
    params?: Record<string, unknown>;
    headers?: Record<string, string>;
    timeout?: number;
}

export interface CalloutSuccess<TData> {
    ok: true;
    status: number;
    envelope: ApiEnvelope<TData>;
}

export interface CalloutFailure {
    ok: false;
    status: number;
    envelope: ApiEnvelope<unknown> | null;
    message: string;
    /** Categoria do erro (rede, timeout, 404, validação...). Ver `ApiError.ts`. */
    kind: ErrorKind;
}

export type CalloutResult<TData> = CalloutSuccess<TData> | CalloutFailure;

type CalloutOptions<TBody = unknown> = Omit<CalloutParams<TBody>, 'url' | 'method' | 'body'>;

export class Callout {
    static #baseUrl = API_URL;

    static #defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
};

static #defaultTimeout = 10000;

/** Função chamada quando a API responde 401 COM token ativo (sessão expirada). */
static #unauthorizedHandler: (() => void) | null = null;

/** Liga (string) ou desliga (null) o header `Authorization: Bearer <token>`. */
static setAuthToken(token: string | null): void {
    if (token) Callout.setDefaultHeader('Authorization', `Bearer ${token}`);
    else Callout.removeDefaultHeader('Authorization');
}

/** Registra o que fazer quando a sessão expira (ex.: deslogar e ir para /login). */
static setUnauthorizedHandler(handler: (() => void) | null): void {
    Callout.#unauthorizedHandler = handler;
}

static setDefaultHeader(key: string, value: string): void {
    Callout.#defaultHeaders[key] = value;
}

static removeDefaultHeader(key: string): void {
    delete Callout.#defaultHeaders[key];
}

static async request<TData = unknown, TBody = unknown>(
    { url = '', method = 'GET', body, params = {}, headers = {}, timeout }: CalloutParams<TBody>,
    dataSchema?: z.ZodType<TData>,
): Promise<CalloutResult<TData>> {
    const hasBody = method !== 'GET' && method !== 'DELETE';

    const config: AxiosRequestConfig = {
        url: Callout.#baseUrl + url,
        method,
        params,
        headers: { ...Callout.#defaultHeaders, ...headers },
        timeout: timeout ?? Callout.#defaultTimeout,
        responseType: 'json',
        ...(hasBody ? { data: body } : {}),
    };
    
    try {
        const response = await axios.request(config);

        // Sem corpo (ex.: `DELETE` -> 204 No Content): a operação deu certo, só
        // não há envelope pra ler. Quem precisa de dado (`fromUnit`/`fromList`)
        // trata a ausência; `fromVoid` só confere o `ok`.
        if (response.status === 204 || response.data === '' || response.data == null) {
            return { ok: true, status: response.status, envelope: { status: response.status, message: '' } };
        }

        const envelope = parseApiEnvelope<TData>(response.data, dataSchema);

    if (!envelope) {
        return {
            ok: false,
            status: response.status,
            envelope: null,
            message: 'Resposta da API fora do formato esperado (ApiResponseInterface)',
            kind: 'invalid_response',
        };
    }
    
    return { ok: true, status: response.status, envelope };
} catch (error) {
    return Callout.#toFailure(error as AxiosError);
}
}

static get<TData = unknown>(url: string, dataSchema?: z.ZodType<TData>, options: CalloutOptions = {}) {
    return Callout.request<TData>({ ...options, url, method: 'GET' }, dataSchema);
}

static post<TData = unknown, TBody = unknown>(
    url: string,
    body?: TBody,
    dataSchema?: z.ZodType<TData>,
    options: CalloutOptions<TBody> = {},
) {
    return Callout.request<TData, TBody>({ ...options, url, method: 'POST', body }, dataSchema);
}

static put<TData = unknown, TBody = unknown>(
    url: string,
    body?: TBody,
    dataSchema?: z.ZodType<TData>,
    options: CalloutOptions<TBody> = {},
) {
    return Callout.request<TData, TBody>({ ...options, url, method: 'PUT', body }, dataSchema);
}

static patch<TData = unknown, TBody = unknown>(
    url: string,
    body?: TBody,
    dataSchema?: z.ZodType<TData>,
    options: CalloutOptions<TBody> = {},
) {
    return Callout.request<TData, TBody>({ ...options, url, method: 'PATCH', body }, dataSchema);
}

static delete<TData = unknown>(url: string, dataSchema?: z.ZodType<TData>, options: CalloutOptions = {}) {
    return Callout.request<TData>({ ...options, url, method: 'DELETE' }, dataSchema);
}

static #toFailure(err: AxiosError): CalloutFailure {
    const status = err.response?.status ?? 0;
    const envelope = parseApiEnvelope(err.response?.data);

    // Sem resposta (status 0): ou estourou o tempo, ou nem chegou no servidor.
    const kind: ErrorKind =
        status === 0 ? (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT' ? 'timeout' : 'network') : kindFromStatus(status);

    // 401 com token ativo = sessão expirou. Sem token (ex.: senha errada no
    // login) NÃO dispara, senão o login falho derrubaria a tela.
    if (kind === 'unauthorized' && Callout.#defaultHeaders['Authorization']) {
        Callout.#unauthorizedHandler?.();
    }

    return {
        ok: false,
        status,
        envelope,
        kind,
        message: envelope?.error ?? envelope?.message ?? DEFAULT_ERROR_MESSAGES[kind],
    };
}
}