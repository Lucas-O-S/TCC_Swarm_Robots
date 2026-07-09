/** Schema manual pro @ApiBody do Swagger (estilo ApiGameHit). */
export const RobotSchema = {
    schema: {
        type: 'object',
        properties: {
            address: { type: 'string', example: '0000000000000001' },
            name: { type: 'string', example: 'DotBot 01' },
            application: { type: 'number', example: 0 },
            swarmId: { type: 'string', example: '0000' },
            waypointsThreshold: { type: 'number', example: 100 },
            taskId: { type: 'string', example: 'a3f1c2d4-...' },
        },
        required: ['address', 'name'],
    },
};
