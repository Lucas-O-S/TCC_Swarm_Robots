import { Callout } from '../Integration/Callout';
import type { CalloutResult } from '../Integration/Callout';
import type { z } from 'zod';

/**
 * CRUD genérico sobre um recurso REST, usando `Callout` por baixo.
 */
export function createBaseRepository<TDto, TCreateBody = Partial<TDto>, TUpdateBody = Partial<TDto>>(
    resource: string,
    schema: z.ZodType<TDto>,
) {
    return {
        findAll(): Promise<CalloutResult<TDto>> {
            return Callout.get(resource, schema);
        },
        
        findByUuid(uuid: string): Promise<CalloutResult<TDto>> {
            return Callout.get(`${resource}/${uuid}`, schema);
        },
        
        create(body: TCreateBody): Promise<CalloutResult<TDto>> {
            return Callout.post(resource, body, schema);
        },
        
        update(uuid: string, body: TUpdateBody): Promise<CalloutResult<TDto>> {
            return Callout.put(`${resource}/${uuid}`, body, schema);
        },
        
        remove(uuid: string): Promise<CalloutResult<unknown>> {
            return Callout.delete(`${resource}/${uuid}`);
        },
    };
}