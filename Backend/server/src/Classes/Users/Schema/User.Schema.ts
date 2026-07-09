/** Schema manual pro @ApiBody do Swagger (estilo ApiGameHit). */
export const UserSchema = {
    schema: {
        type: 'object',
        properties: {
            username: { type: 'string', example: 'lucas' },
            password: { type: 'string', example: 'senhaForte123' },
        },
        required: ['username', 'password'],
    },
};
