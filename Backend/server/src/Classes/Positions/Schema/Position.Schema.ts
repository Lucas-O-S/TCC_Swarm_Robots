/** Schema manual pro @ApiBody do Swagger (estilo ApiGameHit). */
export const PositionSchema = {
    schema: {
        type: 'object',
        properties: {
            robotId: { type: 'string', example: 'a3f1c2d4-...' },
            source: { type: 'number', example: 0 },
            x: { type: 'number', example: 120.5 },
            y: { type: 'number', example: 340.2 },
            direction: { type: 'number', example: 90 },
        },
        required: ['robotId', 'x', 'y'],
    },
};
