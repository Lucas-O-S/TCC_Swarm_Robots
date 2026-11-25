import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ApiResponseInterceptor } from './Classes/Interceptors/ApiResponse.Interceptor';
import { ApiResponseExceptionFilter } from './Classes/Filters/ApiResponse.Filter';

/**
 * Configuração global da API: validação dos DTOs e envelope padrão de
 * resposta ({status, message, data?, dataUnit?, error?}). Usada pelo main.ts
 * e pelos testes de API (test/helpers/app.ts), pra os dois rodarem com as
 * mesmas regras.
 */
export function configureApp(app: INestApplication): void {
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));

  app.useGlobalInterceptors(new ApiResponseInterceptor());
  app.useGlobalFilters(new ApiResponseExceptionFilter());
}
