/** Schema manual pro @ApiBody do Swagger (estilo ApiGameHit). */
export const ControlModeSchema = {
    schema: {
        type: 'object',
        properties: {
            mode: { type: 'number', enum: [0, 1], example: 0 },
        },
        required: ['mode'],
    },
};
