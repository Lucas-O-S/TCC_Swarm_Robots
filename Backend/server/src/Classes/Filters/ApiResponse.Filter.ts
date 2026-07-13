import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import { Response } from "express";
import { ApiResponseInterface } from "src/Protocol/ApiResponse/ApiResponse.Interface";
import { getApiResponseMessage } from "src/Protocol/ApiResponse/ApiResponse.Messages";

/**
 * Captura qualquer exception lançada (HttpException do Nest - 404, 409,
 * 401, erro de validação do ValidationPipe - ou um Error genérico) e
 * devolve no mesmo formato ApiResponseInterface da resposta de sucesso.
 * `message` é genérica por status; o detalhe específico (ex.: "Nome de
 * usuário já está em uso") vai em `error`. Aplicado globalmente (main.ts).
 */
@Catch()
export class ApiResponseExceptionFilter implements ExceptionFilter {

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();

        const isHttpException = exception instanceof HttpException;
        const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

        const detail = this.extractErrorDetail(exception, isHttpException);

        const envelope: ApiResponseInterface = {
            status,
            message: getApiResponseMessage(status, true),
            error: detail,
        };

        response.status(status).json(envelope);
    }

    private extractErrorDetail(exception: unknown, isHttpException: boolean): string {
        if (isHttpException) {
            const body = (exception as HttpException).getResponse();
            const rawMessage = typeof body === "string" ? body : (body as { message?: string | string[] })?.message;

            if (Array.isArray(rawMessage)) {
                return rawMessage.join(", ");
            }
            if (typeof rawMessage === "string") {
                return rawMessage;
            }
        }

        if (exception instanceof Error && exception.message) {
            return exception.message;
        }

        return "Erro desconhecido";
    }
}
