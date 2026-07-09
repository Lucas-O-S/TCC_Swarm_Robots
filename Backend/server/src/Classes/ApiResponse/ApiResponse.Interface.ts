import { HttpStatus } from "@nestjs/common";

/**
 * Formato padrão de toda resposta da API (estilo ApiGameHit), aplicado
 * globalmente via ApiResponseInterceptor (sucesso) e
 * ApiResponseExceptionFilter (erro) - ver src/Classes/Interceptors e
 * src/Classes/Filters. Controllers não precisam montar isso na mão nem usar
 * try/catch em cada método: basta retornar o dado normalmente ou lançar uma
 * exception (HttpException ou não) que o envelope acontece sozinho.
 */
export interface ApiResponseInterface<T = any> {
    status: HttpStatus;
    message: string;
    data?: T[];
    dataUnit?: T;
    error?: string;
}
