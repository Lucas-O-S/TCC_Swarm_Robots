import { OnGatewayDisconnect, OnGatewayInit, WebSocketGateway } from "@nestjs/websockets";
import { timingSafeEqual } from "crypto";
import { Namespace, Socket } from "socket.io";
import { edgeConfig } from "src/config/edge.config";

/**
 * Porta de entrada da borda na API: a borda conecta aqui como cliente
 * socket.io, no namespace /edge, com `auth: { token, edgeId }` no handshake.
 *
 * Regras (no middleware, antes de aceitar a conexão):
 *  - token tem que bater com o EDGE_TOKEN (vazio = sem checagem, dev);
 *  - edgeId é obrigatório (identifica a borda no log);
 *  - uma borda por vez. Mesmo edgeId substitui a conexão antiga (reconexão
 *    antes do ping timeout derrubar a velha); edgeId diferente é recusado.
 */
@WebSocketGateway({ namespace: "/edge" })
export class EdgeGateway implements OnGatewayInit, OnGatewayDisconnect {

    private edge: Socket | null = null;

    private readonly connectedListeners: ((socket: Socket) => void)[] = [];

    onEdgeConnected(callback: (socket: Socket) => void): void {
        this.connectedListeners.push(callback);
    }

    afterInit(namespace: Namespace): void {
        if (!edgeConfig.token) console.warn("[EDGE] EDGE_TOKEN vazio - /edge aceita borda sem token");

        namespace.use((socket, next) => {
            const { token, edgeId } = socket.handshake.auth ?? {};
            const ip = this.ipOf(socket);

            if (!this.validToken(token)) {
                console.warn(`[EDGE] borda recusada: token inválido (edgeId=${edgeId ?? "-"}, ip=${ip})`);
                return next(new Error("token inválido"));
            }

            if (typeof edgeId !== "string" || !edgeId.trim()) {
                console.warn(`[EDGE] borda recusada: sem edgeId (ip=${ip})`);
                return next(new Error("edgeId obrigatório"));
            }

            if (this.edge?.connected) {
                if (this.edge.data.edgeId !== edgeId) {
                    console.warn(`[EDGE] borda recusada: ${edgeId} (ip=${ip}) - ${this.edge.data.edgeId} já está conectada`);
                    return next(new Error("já existe uma borda conectada"));
                }
                console.warn(`[EDGE] ${edgeId} reconectou (ip=${ip}) - derrubando a conexão antiga`);
                this.edge.disconnect(true);
            }

            // Reserva aqui, não no "connection": duas bordas no mesmo instante
            // passariam as duas pelo middleware antes de qualquer uma conectar.
            socket.data.edgeId = edgeId;
            socket.data.ip = ip;
            this.edge = socket;
            console.log(`[EDGE] borda conectada: edgeId=${edgeId}, ip=${ip}`);

            // Antes do next(): a borda manda o robot:snapshot assim que recebe
            // o connect, então os listeners já têm que estar no socket.
            for (const listener of this.connectedListeners) listener(socket);
            next();
        });
    }

    handleDisconnect(socket: Socket): void {
        if (socket !== this.edge) return;
        this.edge = null;
        console.warn(`[EDGE] borda desconectada: edgeId=${socket.data.edgeId}, ip=${socket.data.ip}`);
    }

    /** Borda conectada agora (null = nenhuma). */
    get current(): Socket | null {
        return this.edge?.connected ? this.edge : null;
    }

    private validToken(token: unknown): boolean {
        if (!edgeConfig.token) return true;
        if (typeof token !== "string") return false;
        const received = Buffer.from(token);
        const expected = Buffer.from(edgeConfig.token);
        return received.length === expected.length && timingSafeEqual(received, expected);
    }

    // Em produção a API fica atrás do Caddy, que preenche o X-Forwarded-For;
    // sem proxy (dev), vale o endereço do socket.
    private ipOf(socket: Socket): string {
        const forwarded = socket.handshake.headers["x-forwarded-for"];
        const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim();
        return first || socket.handshake.address;
    }
}
