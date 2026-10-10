import { HttpException, HttpStatus, Injectable, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from "@nestjs/common";
import { io, Socket } from "socket.io-client";
import { edgeConfig } from "src/config/edge.config";
import { Command } from "src/Enums/Command.enum";
import { EdgeSocketEvents } from "src/Enums/EdgeSocketEvents.enum";
import { EdgeRobotSnapshot, EdgeRobotState, EdgeRobotStatusEvent } from "./Edge.Types";

/**
 * Único ponto da API que conversa com a borda. Substitui o antigo
 * GatewayAdapter: em vez de bytes, fala o contrato público da borda.
 *  - comandos: HTTP  POST {EDGE_URL}/v1/robots/:address/commands/:comando
 *  - telemetria: socket.io  robot:state / robot:status
 * Ao (re)conectar, puxa GET /v1/robots para não perder robô que anunciou
 * enquanto a API estava fora.
 */
@Injectable()
export class EdgeClient implements OnModuleInit, OnModuleDestroy {

    private socket: Socket | null = null;

    private readonly stateListeners: ((state: EdgeRobotState) => void)[] = [];

    private readonly statusListeners: ((event: EdgeRobotStatusEvent) => void)[] = [];

    // Evita repetir o aviso de "borda fora" a cada tentativa de reconexão.
    private warnedOffline = false;

    onModuleInit(): void {
        this.socket = io(edgeConfig.url, {
            auth: edgeConfig.token ? { token: edgeConfig.token } : undefined,
            transports: ["websocket"],
            reconnection: true,
        });

        this.socket.on("connect", () => {
            this.warnedOffline = false;
            console.log(`[EDGE] conectado na borda em ${edgeConfig.url}`);
            this.resync().catch((error) =>
                console.error("[EDGE] erro ao sincronizar com a borda:", error.message ?? error),
            );
        });

        this.socket.on("disconnect", (reason) => {
            console.warn(`[EDGE] desconectado da borda (${reason})`);
        });

        this.socket.on("connect_error", (error) => {
            if (this.warnedOffline) return;
            this.warnedOffline = true;
            console.warn(`[EDGE] não conectou na borda em ${edgeConfig.url} (${error.message}) - tentando de novo em segundo plano`);
        });

        this.socket.on(EdgeSocketEvents.RobotState, (state: EdgeRobotState) => this.publishState(state));

        this.socket.on(EdgeSocketEvents.RobotStatus, (event: EdgeRobotStatusEvent) => this.publishStatus(event));
    }

    onModuleDestroy(): void {
        this.socket?.close();
        this.socket = null;
    }

    /** Assina os estados que chegam da borda (SwarmService). */
    onState(callback: (state: EdgeRobotState) => void): void {
        this.stateListeners.push(callback);
    }

    /** Assina as mudanças de status calculadas pela borda (SwarmService). */
    onStatus(callback: (event: EdgeRobotStatusEvent) => void): void {
        this.statusListeners.push(callback);
    }

    /** Manda um comando para o robô pela borda. Erro da borda vira HttpException aqui. */
    async sendCommand(address: string, command: Command, payload: any): Promise<unknown> {
        return this.request("POST", `/v1/robots/${encodeURIComponent(address)}/commands/${command}`, payload);
    }

    /** Quadro atual da frota segundo a borda. */
    async getRobots(): Promise<EdgeRobotSnapshot[]> {
        return this.request<EdgeRobotSnapshot[]>("GET", "/v1/robots");
    }

    private async resync(): Promise<void> {
        const snapshots = await this.getRobots();
        for (const snapshot of snapshots) {
            this.publishState(snapshot.state);
            this.publishStatus({ address: snapshot.address, status: snapshot.status, lastSync: snapshot.state.updatedAt });
        }
    }

    private publishState(state: EdgeRobotState): void {
        for (const listener of this.stateListeners) listener(state);
    }

    private publishStatus(event: EdgeRobotStatusEvent): void {
        for (const listener of this.statusListeners) listener(event);
    }

    private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
        const headers: Record<string, string> = { "content-type": "application/json" };
        if (edgeConfig.token) headers.authorization = `Bearer ${edgeConfig.token}`;

        let response: Response;
        try {
            response = await fetch(`${edgeConfig.url}${path}`, {
                method,
                headers,
                body: body === undefined ? undefined : JSON.stringify(body),
                signal: AbortSignal.timeout(edgeConfig.requestTimeoutMs),
            });
        } catch {
            throw new ServiceUnavailableException(`Borda indisponível em ${edgeConfig.url}`);
        }

        const text = await response.text();
        let json: any = undefined;
        try {
            json = text ? JSON.parse(text) : undefined;
        } catch {
            json = text;
        }

        if (!response.ok) {
            const detail = Array.isArray(json?.message) ? json.message.join("; ") : (json?.message ?? response.statusText);
            // 400/404 da borda são erro do pedido: repassa igual. Token recusado
            // ou falha interna da borda são problema entre API e borda: 502.
            const status = response.status >= 500 || response.status === 401 || response.status === 403
                ? HttpStatus.BAD_GATEWAY
                : response.status;
            throw new HttpException(`Borda: ${detail}`, status);
        }

        return json as T;
    }
}
