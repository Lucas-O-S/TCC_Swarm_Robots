import { z } from 'zod';

export interface ApiEnvelope<TData = unknown> {
    status: number;
    message: string;
    data?: TData[];
    dataUnit?: TData;
    error?: string;
}

export function apiEnvelopeSchema<TDataSchema extends z.ZodTypeAny>(dataSchema: TDataSchema) {
    return z.object({
        status: z.number(),
        message: z.string(),
        data: z.array(dataSchema).optional(),
        dataUnit: dataSchema.optional(),
        error: z.string().optional(),
    });
}

export const unknownApiEnvelopeSchema = apiEnvelopeSchema(z.unknown());
export type UnknownApiEnvelope = ApiEnvelope<unknown>;

export function parseApiEnvelope<TData>(raw: unknown, dataSchema?: z.ZodType<TData>): ApiEnvelope<TData> | null {
    const schema = dataSchema ? apiEnvelopeSchema(dataSchema) : unknownApiEnvelopeSchema;
    const result = schema.safeParse(raw);
    
    return result.success ? (result.data as ApiEnvelope<TData>) : null;
}