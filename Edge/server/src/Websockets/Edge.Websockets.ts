import { OnGatewayInit, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server } from "socket.io";
import { EdgeSocketEvents } from "src/Enums/EdgeSocketEvents.enum";
import { bearerToken, isEdgeTokenValid } from "src/Classes/Auth/EdgeToken.Guard";
import { RobotJoinedEvent, RobotState, RobotStatusEvent } from "src/Classes/Swarm/Robot.State";

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

    emitState(state: RobotState): void {
        this.server.emit(EdgeSocketEvents.RobotState, state);
    }

    emitStatus(event: RobotStatusEvent): void {
        this.server.emit(EdgeSocketEvents.RobotStatus, event);
    }

    emitJoined(event: RobotJoinedEvent): void {
        this.server.emit(EdgeSocketEvents.RobotJoined, event);
    }
}
