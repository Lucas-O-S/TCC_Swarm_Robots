import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { authConfig } from "src/config/auth.config";

/**
 * Wrapper do AuthGuard('jwt') do passport que respeita o
 * `authConfig.activated` (AUTH_ACTIVATED no .env): com a auth desligada,
 * libera geral sem checar token - é o "ponto único" pra ligar/desligar
 * autenticação em todas as rotas que usam este guard.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {

    canActivate(context: ExecutionContext) {
        if (!authConfig.activated) {
            return true;
        }

        return super.canActivate(context);
    }
}
