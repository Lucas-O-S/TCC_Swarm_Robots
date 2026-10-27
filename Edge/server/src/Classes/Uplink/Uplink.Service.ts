import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { io, Socket } from "socket.io-client";
import { edgeConfig } from "src/config/edge.config";
import { UplinkCommand, UplinkCommandReply } from "./Uplink.Types";
import { EdgeSocketEvents } from "src/Enums/EdgeSocketEvents.enum";

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

    private readonly connectListeners: (() => void)[] = [];

    private retryTimer: NodeJS.Timeout | null = null;

    private commandHandler: ((command: UplinkCommand) => Promise<UplinkCommandReply>) | null = null;


    // Evita repetir o aviso de "back fora" a cada tentativa de reconexão.
    private warnedOffline = false;

    onModuleInit(): void {
        if (!edgeConfig.backendUrl) return;

        this.socket = io(edgeConfig.backendUrl, {
            auth: { 
                token: edgeConfig.token,
                edgeId: edgeConfig.edgeId
            },
            transports: ["websocket"],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 10000,
        });

        this.socket.on("connect", () => {
            this.warnedOffline = false;
            
            for (const listener of this.connectListeners) listener();

            console.log(`[UPLINK] conectado no back em ${edgeConfig.backendUrl}`);
        });

        this.socket.on("disconnect", (reason) => {
            console.warn(`[UPLINK] desconectado do back (${reason})`);
            // Quando é o servidor que derruba, o cliente não reconecta sozinho.
            if (reason === "io server disconnect") this.socket?.connect();
        });

        this.socket.on(EdgeSocketEvents.RobotCommand, async (command: UplinkCommand, ack?: (reply: UplinkCommandReply) => void) => {
            const reply = this.commandHandler
                ? await this.commandHandler(command)
                : { ok: false as const, status: 503, message: "Borda sem executor de comandos" };
            ack?.(reply);
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


    /** Chamado a cada (re)conexão com o back. */
    onConnect(listener: () => void): void {
        this.connectListeners.push(listener);
    }

    /** Quem executa os comandos que chegam pelo uplink (a UplinkBridge). */
    onCommand(handler: (command: UplinkCommand) => Promise<UplinkCommandReply>): void {
        this.commandHandler = handler;
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
