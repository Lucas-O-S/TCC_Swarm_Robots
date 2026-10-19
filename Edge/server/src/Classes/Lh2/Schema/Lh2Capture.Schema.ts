import { Lh2Corner } from "src/Enums/Lh2Corner.enum";

/** Schemas manuais pro @ApiBody do Swagger (estilo ApiGameHit). */
export const Lh2CaptureStartSchema = {
    required: true,
    schema: {
        type: 'object',
        required: ['address'],
        properties: {
            address: { type: 'string', example: 'BDF2B04BC00D2725' },
            distanceMm: { type: 'integer', example: 500 },
            tag: { type: 'string', example: 'arena-taak' },
        },
    },
};

export const Lh2CaptureCornerSchema = {
    required: true,
    schema: {
        type: 'object',
        required: ['corner'],
        properties: {
            corner: { type: 'string', enum: Object.values(Lh2Corner), example: Lh2Corner.TopLeft },
        },
    },
};
