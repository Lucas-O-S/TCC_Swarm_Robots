/** Schema manual pro @ApiBody do Swagger (estilo ApiGameHit). */
export const TaskSchema = {
    schema: {
        type: 'object',
        properties: {
            name: { type: 'string', example: 'Patrulhar área A' },
            priority: { type: 'number', example: 0 },
        },
        required: ['name'],
    },
};
