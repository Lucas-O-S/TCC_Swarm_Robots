import { HttpStatus } from "@nestjs/common";

/**
 * Mensagens genéricas por status HTTP (não uma frase específica por ação,
 * tipo "Genero criado com sucesso" do ApiGameHit) - o detalhe específico de
 * cada erro vai no campo `error` do ApiResponseInterface, montado pelo
 * ApiResponseExceptionFilter a partir da exception real.
 */
const SUCCESS_MESSAGES: Partial<Record<HttpStatus, string>> = {
    [HttpStatus.OK]: "Requisição processada com sucesso",
    [HttpStatus.CREATED]: "Recurso criado com sucesso",
    [HttpStatus.NO_CONTENT]: "Removido com sucesso",
};

const ERROR_MESSAGES: Partial<Record<HttpStatus, string>> = {
    [HttpStatus.BAD_REQUEST]: "Requisição inválida",
    [HttpStatus.UNAUTHORIZED]: "Não autorizado",
    [HttpStatus.FORBIDDEN]: "Acesso negado",
    [HttpStatus.NOT_FOUND]: "Recurso não encontrado",
    [HttpStatus.CONFLICT]: "Conflito com o estado atual do recurso",
    [HttpStatus.UNPROCESSABLE_ENTITY]: "Dados inválidos",
    [HttpStatus.INTERNAL_SERVER_ERROR]: "Erro interno no servidor",
};

export function getApiResponseMessage(status: number, isError: boolean): string {
    if (isError) {
        return ERROR_MESSAGES[status as HttpStatus] ?? "Erro ao processar a requisição";
    }
    return SUCCESS_MESSAGES[status as HttpStatus] ?? "Operação concluída com sucesso";
}
