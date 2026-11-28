import { Lh2Corner } from "src/Enums/Lh2Corner.enum";

// Lado, tag e a área real (Lh2LayoutDto): os quatro campos da área juntos ou nenhum.
const LAYOUT_PROPERTIES = {
    distanceMm: { type: 'integer', example: 800 },
    tag: { type: 'string', example: 'arena-taak' },
    areaWidthMm: { type: 'integer', example: 1200 },
    areaHeightMm: { type: 'integer', example: 1200 },
    squareXMm: { type: 'integer', minimum: 0, example: 200 },
    squareYMm: { type: 'integer', minimum: 0, example: 200 },
};

/** Schemas manuais pro @ApiBody do Swagger (estilo ApiGameHit). */
export const Lh2CaptureStartSchema = {
    required: true,
    schema: {
        type: 'object',
        required: ['address'],
        properties: {
            address: { type: 'string', example: 'BDF2B04BC00D2725' },
            ...LAYOUT_PROPERTIES,
            channel: { type: 'integer', minimum: 1, maximum: 16, example: 7 },
        },
    },
};

export const Lh2ReframeSchema = {
    required: true,
    schema: {
        type: 'object',
        required: ['areaWidthMm', 'areaHeightMm', 'squareXMm', 'squareYMm'],
        properties: LAYOUT_PROPERTIES,
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
