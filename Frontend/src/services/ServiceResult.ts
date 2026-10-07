import type { z } from 'zod';
import type { CalloutResult } from '../Integration/Callout';
import { DEFAULT_ERROR_MESSAGES } from '../Integration/ApiError';
import type { ErrorKind } from '../Integration/ApiError';

/**
 * O que TODO service devolve pra tela: nunca lança, sempre `ok: true | false`.
 * Em caso de falha, `kind` diz a categoria (rede, 404, validação...) e
 * `status` o código HTTP (0 = nunca chegou resposta / erro de validação local).
 */
export interface ServiceFailure {
    ok: false;
    message: string;
    kind: ErrorKind;
    status: number;
}

export interface ServiceSuccess<T> {
    ok: true;
    data: T;
}

export type ServiceResult<T> = ServiceSuccess<T> | ServiceFailure;

export function success<T>(data: T): ServiceSuccess<T> {
    return { ok: true, data };
}

export function failure(kind: ErrorKind, message?: string, status = 0): ServiceFailure {
    return { ok: false, kind, status, message: message ?? DEFAULT_ERROR_MESSAGES[kind] };
}

/** Converte a falha de baixo nível (`Callout`) na falha de service. */
function fromCalloutFailure(result: Extract<CalloutResult<unknown>, { ok: false }>): ServiceFailure {
    return failure(result.kind, result.message, result.status);
}

/**
 * LISTA: `data: [dto, dto]` -> `[model, model]`.
 * Lista vazia NÃO é erro: `data` ausente ou `[]` viram `[]` (a tela decide
 * mostrar "nenhum item ainda").
 */
export function fromList<TDto, TModel>(
    result: CalloutResult<TDto>,
    toModel: (dto: TDto) => TModel,
): ServiceResult<TModel[]> {
    if (!result.ok) return fromCalloutFailure(result);
    return success((result.envelope.data ?? []).map(toModel));
}

/**
 * OBJETO ÚNICO obrigatório: `dataUnit: dto` -> `model`.
 */
export function fromUnit<TDto, TModel>(
    result: CalloutResult<TDto>,
    toModel: (dto: TDto) => TModel,
): ServiceResult<TModel> {
    if (!result.ok) return fromCalloutFailure(result);
    if (result.envelope.dataUnit == null) {
        return failure('invalid_response', 'A API respondeu com sucesso, mas sem os dados esperados.', result.status);
    }
    return success(toModel(result.envelope.dataUnit));
}

/**
 * OBJETO ÚNICO opcional: "não há nada" é um resultado válido (`null`), não um erro.
 */
export function fromNullableUnit<TDto, TModel>(
    result: CalloutResult<TDto>,
    toModel: (dto: TDto) => TModel,
): ServiceResult<TModel | null> {
    if (!result.ok) return fromCalloutFailure(result);
    if (result.envelope.dataUnit == null) return success(null);
    return success(toModel(result.envelope.dataUnit));
}

/** SEM CORPO (ex.: `DELETE` -> 204): só importa se deu certo. */
export function fromVoid(result: CalloutResult<unknown>): ServiceResult<void> {
    if (!result.ok) return fromCalloutFailure(result);
    return success(undefined);
}

/**
 * Valida o que vamos enviar antes de gastar uma chamada de rede. As regras
 * dos schemas (`dto/*.create.dto.ts`) são as mesmas do `class-validator` do
 * backend, então o usuário recebe a mensagem na hora, sem esperar um 400.
 * O resultado já vem "limpo" (campos desconhecidos removidos pelo zod).
 */
export function parseRequest<T>(schema: z.ZodType<T>, input: unknown): ServiceResult<T> {
    const parsed = schema.safeParse(input);
    if (parsed.success) return success(parsed.data);

    const message = parsed.error.issues.map((issue) => issue.message).join('; ');
    return failure('validation', message);
}
