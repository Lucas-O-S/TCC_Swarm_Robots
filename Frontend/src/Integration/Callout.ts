import axios from 'axios';
import type { AxiosError, AxiosRequestConfig } from 'axios';
import type { z } from 'zod';
import type { ApiEnvelope } from '../services/ApiEnvelope';
import { parseApiEnvelope } from '../services/ApiEnvelope';

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
}

export type CalloutResult<TData> = CalloutSuccess<TData> | CalloutFailure;

type CalloutOptions<TBody = unknown> = Omit<CalloutParams<TBody>, 'url' | 'method' | 'body'>;

export class Callout {
    static #baseUrl = API_URL;

    static #defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
};

static #defaultTimeout = 10000;

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
        const envelope = parseApiEnvelope<TData>(response.data, dataSchema);

    if (!envelope) {
        return {
            ok: false,
            status: response.status,
            envelope: null,
            message: 'Resposta da API fora do formato esperado (ApiResponseInterface)',
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

    return {
    ok: false,
    status,
    envelope,
    message: envelope?.error ?? envelope?.message ?? err.message ?? 'Erro de requisição',
    };
}
}