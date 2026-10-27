/** Schema manual pro @ApiBody do Swagger (estilo ApiGameHit). */
export const RgbLedSchema = {
    schema: {
        type: 'object',
        properties: {
            red: { type: 'number', example: 255 },
            green: { type: 'number', example: 0 },
            blue: { type: 'number', example: 0 },
        },
        required: ['red', 'green', 'blue'],
    },
};
