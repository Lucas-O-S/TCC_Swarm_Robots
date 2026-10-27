/** Schema manual pro @ApiBody do Swagger (estilo ApiGameHit). */
export const XgoActionSchema = {
    schema: {
        type: 'object',
        properties: {
            action: { type: 'number', example: 1 },
        },
        required: ['action'],
    },
};
