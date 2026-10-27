/** Schema manual pro @ApiBody do Swagger (mesmo estilo das rotas do Robot). */
export const AssignTaskSchema = {
    schema: {
        type: 'object',
        properties: {
            taskId: { type: 'string', format: 'uuid' },
        },
        required: ['taskId'],
    },
};
