import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server } from "socket.io";

/**
 * Canal WebSocket: empurra pro front cada atualização de estado da frota.
 * O front conecta uma vez e passa a receber os eventos "robot:update" ao vivo,
 * em vez de ficar perguntando no GET /status.
 */
@WebSocketGateway({ cors: { origin: "*" } })
export class SwarmGateway {

    @WebSocketServer()
    private server: Server;

    /** Avisa todos os clientes conectados que um robô atualizou o estado. */
    emitUpdate(address: string, state: any): void {
        // server pode não estar pronto se algo emitir antes do boot do socket.
        this.server?.emit("robot:update", { address, state });
    }
}
