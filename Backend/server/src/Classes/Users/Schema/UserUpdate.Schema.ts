/** Schema manual pro @ApiBody do Swagger (estilo ApiGameHit). */
export const UserUpdateSchema = {
    schema: {
        type: 'object',
        properties: {
            username: { type: 'string', example: 'lucas' },
        },
        required: ['username', 'password'],
    },
};
