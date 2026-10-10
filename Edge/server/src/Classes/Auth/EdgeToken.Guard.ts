import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { edgeConfig } from "src/config/edge.config";

/** Confere um token recebido (REST ou socket.io) contra o EDGE_TOKEN. */
export function isEdgeTokenValid(token: string | undefined | null): boolean {
    if (!edgeConfig.authActivated) return true;
    return !!edgeConfig.token && token === edgeConfig.token;
}

/** Extrai o token de um header `Authorization: Bearer <token>`. */
export function bearerToken(header: string | undefined): string | undefined {
    if (!header) return undefined;
    const [scheme, value] = header.split(" ");
    return scheme?.toLowerCase() === "bearer" ? value : undefined;
}

/**
 * Guard das rotas REST da borda. Com EDGE_AUTH_ACTIVATED=false libera geral;
 * com true exige `Authorization: Bearer <EDGE_TOKEN>`.
 */
@Injectable()
export class EdgeTokenGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        if (isEdgeTokenValid(bearerToken(request.headers?.authorization))) {
            return true;
        }
        throw new UnauthorizedException("Token da borda ausente ou inválido");
    }
}
