import { Callout } from '../Integration/Callout';
import type { CalloutResult } from '../Integration/Callout';
import type { z } from 'zod';

/**
 * CRUD genérico sobre um recurso REST, usando `Callout` por baixo. Espelha o
 * `BaseController` do backend.
 */
export function createBaseRepository<TDto, TCreateBody = Partial<TDto>, TUpdateBody = Partial<TDto>>(
    resource: string,
    schema: z.ZodType<TDto>,
) {
    // O uuid vai no PATH: codificar evita que um valor estranho ("a/b", "?x=1")
    // altere a rota que está sendo chamada.
    const item = (uuid: string) => `${resource}/${encodeURIComponent(uuid)}`;

    return {
        findAll(): Promise<CalloutResult<TDto>> {
            return Callout.get(resource, schema);
        },

        findByUuid(uuid: string): Promise<CalloutResult<TDto>> {
            return Callout.get(item(uuid), schema);
        },

        create(body: TCreateBody): Promise<CalloutResult<TDto>> {
            return Callout.post(resource, body, schema);
        },

        update(uuid: string, body: TUpdateBody): Promise<CalloutResult<TDto>> {
            return Callout.put(item(uuid), body, schema);
        },

        remove(uuid: string): Promise<CalloutResult<unknown>> {
            return Callout.delete(item(uuid));
        },
    };
}