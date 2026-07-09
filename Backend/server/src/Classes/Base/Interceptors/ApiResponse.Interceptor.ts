import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { ApiResponseInterface } from "../ApiResponse.Interface";
import { getApiResponseMessage } from "../ApiResponse.Messages";

/**
 * Envelopa toda resposta de sucesso em ApiResponseInterface, aplicado
 * globalmente (ver main.ts) - substitui o try/catch manual em cada endpoint
 * do padrão ApiGameHit. Controllers continuam retornando o dado "cru"
 * (RobotModel, UserModel[], etc.), este interceptor só empacota.
 */
@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<T, ApiResponseInterface<T>> {

    intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponseInterface<T>> {
        const response = context.switchToHttp().getResponse();

        return next.handle().pipe(
            map((result): ApiResponseInterface<T> => {
                const status = response.statusCode;
                const envelope: ApiResponseInterface<T> = {
                    status,
                    message: getApiResponseMessage(status, false),
                };

                if (Array.isArray(result)) {
                    envelope.data = result;
                } else if (result !== undefined) {
                    envelope.dataUnit = result;
                }

                return envelope;
            }),
        );
    }
}
