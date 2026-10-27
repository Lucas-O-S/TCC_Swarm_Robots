import { HttpException, HttpStatus, Injectable, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from "@nestjs/common";
import { io, Socket } from "socket.io-client";
import { Socket as EdgeSocket } from "socket.io";
import { edgeConfig } from "src/config/edge.config";
import { Command } from "src/Enums/Command.enum";
import { EdgeSocketEvents } from "src/Enums/EdgeSocketEvents.enum";
import { EdgeGateway } from "./Edge.Gateway";
import { EdgeCommandAck, EdgeCommandRequest, EdgeRobotSnapshot, EdgeRobotState, EdgeRobotStatesEvent, EdgeRobotStatusEvent } from "./Edge.Types";

/**
 * Único ponto da API que conversa com a borda. Substitui o antigo
 * GatewayAdapter: em vez de bytes, fala o contrato público da borda.
 *  - comandos: HTTP  POST {EDGE_URL}/v1/robots/:address/commands/:comando
 *  - telemetria: socket.io  robot:states (lote) / robot:status
 * Dois jeitos de receber a telemetria, os dois alimentam os mesmos listeners:
 *  - borda conecta na API (namespace /edge, EdgeGateway) e manda
 *    robot:snapshot ao conectar;
 *  - API conecta na borda (só com EDGE_URL definido) e puxa GET /v1/robots
 *    a cada (re)conexão.
 */
@Injectable()
export class EdgeClient implements OnModuleInit, OnModuleDestroy {

    private socket: Socket | null = null;

    private readonly stateListeners: ((state: EdgeRobotState) => void)[] = [];

    private readonly statusListeners: ((event: EdgeRobotStatusEvent) => void)[] = [];

    // Evita repetir o aviso de "borda fora" a cada tentativa de reconexão.
    private warnedOffline = false;

    constructor(private readonly edgeGateway: EdgeGateway) {}

    onModuleInit(): void {
        this.edgeGateway.onEdgeConnected((socket) => this.attach(socket));

        if (!edgeConfig.url) return;

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

        this.socket.on(EdgeSocketEvents.RobotStates, (event: EdgeRobotStatesEvent) => this.onStates(event));
        this.socket.on(EdgeSocketEvents.RobotStatus, (event: EdgeRobotStatusEvent) => this.publishStatus(event));
    }

    /** Borda que acabou de entrar no /edge: mesmos eventos + o snapshot inicial. */
    private attach(socket: EdgeSocket): void {
        socket.on(EdgeSocketEvents.RobotSnapshot, (snapshots: EdgeRobotSnapshot[]) => {
            if (!Array.isArray(snapshots)) return;
            this.applySnapshot(snapshots);
        });
        socket.on(EdgeSocketEvents.RobotStates, (event: EdgeRobotStatesEvent) => this.onStates(event));
        socket.on(EdgeSocketEvents.RobotStatus, (event: EdgeRobotStatusEvent) => this.publishStatus(event));
    }

    // A borda manda em lote; cada item segue pros listeners como antes.
    private onStates(event: EdgeRobotStatesEvent): void {
        if (!Array.isArray(event?.states)) return;
        for (const state of event.states) this.publishState(state);
    }

    private async resync(): Promise<void> {
        this.applySnapshot(await this.getRobots());
    }

    private applySnapshot(snapshots: EdgeRobotSnapshot[]): void {
        for (const snapshot of snapshots) {
            this.publishState(snapshot.state);
            this.publishStatus({ address: snapshot.address, status: snapshot.status, lastSync: snapshot.state.updatedAt });
        }
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

    /**
     * Manda um comando para o robô pela borda. Erro da borda vira HttpException
     * aqui: sem borda 503, 400/404 repassa, 5xx/token recusado/timeout 502.
     * Sem borda no /edge e com EDGE_URL definido, vai por HTTP como antes.
     */
    async sendCommand(address: string, command: Command, payload: any): Promise<unknown> {
        const edge = this.edgeGateway.current;
        if (!edge && edgeConfig.url) {
            return this.request("POST", `/v1/robots/${encodeURIComponent(address)}/commands/${command}`, payload);
        }
        if (!edge) throw new ServiceUnavailableException("Nenhuma borda conectada");

        const request: EdgeCommandRequest = { address, command, payload };
        let ack: EdgeCommandAck;
        try {
            ack = await edge.timeout(edgeConfig.requestTimeoutMs).emitWithAck(EdgeSocketEvents.RobotCommand, request);
        } catch {
            throw new HttpException(`Borda não respondeu em ${edgeConfig.requestTimeoutMs} ms`, HttpStatus.BAD_GATEWAY);
        }

        if (typeof ack?.status !== "number") {
            throw new HttpException("Borda: resposta inválida", HttpStatus.BAD_GATEWAY);
        }
        if (ack.status >= 200 && ack.status < 300) return ack.data;

        const detail = Array.isArray(ack.message) ? ack.message.join("; ") : (ack.message ?? "erro sem mensagem");
        throw new HttpException(`Borda: ${detail}`, this.toApiStatus(ack.status));
    }

    /** Quadro atual da frota segundo a borda. */
    async getRobots(): Promise<EdgeRobotSnapshot[]> {
        return this.request<EdgeRobotSnapshot[]>("GET", "/v1/robots");
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
            throw new HttpException(`Borda: ${detail}`, this.toApiStatus(response.status));
        }

        return json as T;
    }

    // 400/404 da borda são erro do pedido: repassa igual. Token recusado
    // ou falha interna da borda são problema entre API e borda: 502.
    private toApiStatus(edgeStatus: number): number {
        return edgeStatus >= 500 || edgeStatus === 401 || edgeStatus === 403
            ? HttpStatus.BAD_GATEWAY
            : edgeStatus;
    }
}
