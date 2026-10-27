/** Schema manual pro @ApiBody do Swagger (estilo ApiGameHit). */
export const ScenarioSchema = {
    schema: {
        type: 'object',
        properties: {
            name: { type: 'string', example: 'Arena de teste' },
            description: { type: 'string', example: 'Arena com uma caixa no meio' },
            sizeX: { type: 'number', example: 3000 },
            sizeY: { type: 'number', example: 2000 },
            obstacles: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        name: { type: 'string', example: 'Caixa 1' },
                        description: { type: 'string', example: 'Caixa de papelão' },
                        sizeX: { type: 'number', example: 200 },
                        sizeY: { type: 'number', example: 200 },
                        startPointX: { type: 'number', example: 500 },
                        startPointY: { type: 'number', example: 500 },
                    },
                    required: ['name', 'sizeX', 'sizeY', 'startPointX', 'startPointY'],
                },
                example: [{ name: 'Caixa 1', sizeX: 200, sizeY: 200, startPointX: 500, startPointY: 500 }],
            },
        },
        required: ['name', 'sizeX', 'sizeY'],
    },
};
