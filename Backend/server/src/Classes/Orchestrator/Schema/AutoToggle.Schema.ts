/** Schema manual pro @ApiBody do Swagger (mesmo estilo das rotas do Robot). */
export const AutoToggleSchema = {
    schema: {
        type: 'object',
        properties: {
            enabled: { type: 'boolean', example: false },
        },
        required: ['enabled'],
    },
};
