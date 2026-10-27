import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { io, Socket } from "socket.io-client";
import { edgeConfig } from "src/config/edge.config";

/** Espera para tentar de novo quando o back recusa o token (nesse caso o cliente não reconecta sozinho). */
const REJECTED_RETRY_MS = 30_000;

/**
 * Conexão de saída da borda para o back. Serve quando o back não alcança a
 * borda (nuvem, NAT): a borda abre a conexão e empurra por ela os mesmos
 * eventos do EdgeWebsockets. BACKEND_URL vazio = desligado.
 */
@Injectable()
export class UplinkService implements OnModuleInit, OnModuleDestroy {

    private socket: Socket | null = null;

    private retryTimer: NodeJS.Timeout | null = null;

    // Evita repetir o aviso de "back fora" a cada tentativa de reconexão.
    private warnedOffline = false;

    onModuleInit(): void {
        if (!edgeConfig.backendUrl) return;

        this.socket = io(edgeConfig.backendUrl, {
            auth: { token: edgeConfig.token },
            transports: ["websocket"],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 10000,
        });

        this.socket.on("connect", () => {
            this.warnedOffline = false;
            console.log(`[UPLINK] conectado no back em ${edgeConfig.backendUrl}`);
        });

        this.socket.on("disconnect", (reason) => {
            console.warn(`[UPLINK] desconectado do back (${reason})`);
            // Quando é o servidor que derruba, o cliente não reconecta sozinho.
            if (reason === "io server disconnect") this.socket?.connect();
        });

        this.socket.on("connect_error", (error) => {
            // active = false: o back recusou no middleware (token) e o cliente
            // desistiu. Tenta de novo devagar, para voltar sozinho quando o
            // token for corrigido.
            if (!this.socket?.active) {
                console.error(`[UPLINK] back recusou a conexão: ${error.message}`);
                this.retryTimer ??= setTimeout(() => {
                    this.retryTimer = null;
                    this.socket?.connect();
                }, REJECTED_RETRY_MS);
                return;
            }
            if (this.warnedOffline) return;
            this.warnedOffline = true;
            console.warn(`[UPLINK] não conectou no back em ${edgeConfig.backendUrl} (${error.message}) - tentando de novo em segundo plano`);
        });
    }

    onModuleDestroy(): void {
        if (this.retryTimer) clearTimeout(this.retryTimer);
        this.socket?.close();
        this.socket = null;
    }

    /**
     * Manda um evento para o back. Se estiver desconectado, descarta: o
     * socket.io-client guardaria tudo e despejaria estado velho na reconexão.
     */
    emit(event: string, payload: unknown): void {
        if (!this.socket?.connected) return;
        this.socket.emit(event, payload);
    }
}
