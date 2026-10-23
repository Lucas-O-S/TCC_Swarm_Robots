import { OnGatewayInit, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server } from "socket.io";
import { EdgeSocketEvents } from "src/Enums/EdgeSocketEvents.enum";
import { bearerToken, isEdgeTokenValid } from "src/Classes/Auth/EdgeToken.Guard";
import { RobotJoinedEvent, RobotState, RobotStatesEvent, RobotStatusEvent } from "src/Classes/Swarm/Robot.State";

/**
 * Janela do lote do `robot:states`. Curta de propósito: esse fluxo alimenta a
 * malha de controle da API, onde atraso piora o controle; 20 ms já junta
 * vários frames por envio com a frota grande.
 */
const STATES_FLUSH_MS = 20;

/**
 * Canal de eventos da borda (socket.io, na mesma porta do REST). Qualquer
 * cliente que conectar recebe o fluxo da frota; com EDGE_AUTH_ACTIVATED=true a
 * conexão sem token é recusada já no handshake (o cliente recebe connect_error).
 */
@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
export class EdgeWebsockets implements OnGatewayInit {

    // `!`: o @WebSocketServer() preenche em runtime.
    @WebSocketServer()
    private server!: Server;

    afterInit(server: Server): void {
        server.use((socket, next) => {
            const token = socket.handshake.auth?.token ?? bearerToken(socket.handshake.headers?.authorization);
            if (isEdgeTokenValid(token)) {
                next();
                return;
            }
            console.warn(`[EDGE] conexão socket.io recusada (token inválido): ${socket.id}`);
            next(new Error("Token da borda ausente ou inválido"));
        });
    }

    private pendingStates: RobotState[] = [];

    private flushTimer: NodeJS.Timeout | null = null;

    /** Estado novo de um robô: entra no lote e sai no próximo `robot:states` (até STATES_FLUSH_MS). */
    queueState(state: RobotState): void {
        this.pendingStates.push(state);
        this.flushTimer ??= setTimeout(() => this.flushStates(), STATES_FLUSH_MS);
    }

    // status e joined saem na hora, mas DEPOIS dos estados já enfileirados -
    // assim o cliente continua vendo os eventos na ordem em que aconteceram.
    emitStatus(event: RobotStatusEvent): void {
        this.flushStates();
        this.server.emit(EdgeSocketEvents.RobotStatus, event);
    }

    emitJoined(event: RobotJoinedEvent): void {
        this.flushStates();
        this.server.emit(EdgeSocketEvents.RobotJoined, event);
    }

    private flushStates(): void {
        if (this.flushTimer) clearTimeout(this.flushTimer);
        this.flushTimer = null;
        if (this.pendingStates.length === 0) return;
        const event: RobotStatesEvent = { states: this.pendingStates };
        this.pendingStates = [];
        this.server.emit(EdgeSocketEvents.RobotStates, event);
    }
}
