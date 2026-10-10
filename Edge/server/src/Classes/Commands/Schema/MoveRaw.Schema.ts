/** Schema manual pro @ApiBody do Swagger (estilo ApiGameHit). */
export const MoveRawSchema = {
    schema: {
        type: 'object',
        properties: {
            left_x: { type: 'number', example: 100 },
            left_y: { type: 'number', example: 0 },
            right_x: { type: 'number', example: 0 },
            right_y: { type: 'number', example: 0 },
        },
        required: ['left_x', 'left_y', 'right_x', 'right_y'],
    },
};
