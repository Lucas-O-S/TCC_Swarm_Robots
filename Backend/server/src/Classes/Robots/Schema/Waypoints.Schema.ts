/** Schema manual pro @ApiBody do Swagger (estilo ApiGameHit). */
export const WaypointsSchema = {
    schema: {
        type: 'object',
        properties: {
            threshold: { type: 'number', example: 100 },
            waypoints: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        x: { type: 'number', example: 1000 },
                        y: { type: 'number', example: 2000 },
                    },
                },
                example: [{ x: 1000, y: 2000 }, { x: 1500, y: 800 }],
            },
        },
        required: ['threshold', 'waypoints'],
    },
};
