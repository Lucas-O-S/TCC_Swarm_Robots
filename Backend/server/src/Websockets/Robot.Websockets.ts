import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server } from "socket.io";
import { SocketEvents } from "src/Enums/SocketEvents.Enum";


@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class RobotWebsockets {


    // `!`: o decorator @WebSocketServer() preenche isto em runtime; o TS não
    // enxerga isso, então afirmamos que estará definido (senão strict reclama).
    @WebSocketServer()
    private server!: Server;

    emitUpdate(address: string, state: any): void {
        this.server.emit(SocketEvents.RobotUpdate, { address, state });

    }

    /**
     * Mudança de status calculada pelo SwarmService (Active/Inactive/Lost por
     * silêncio) - acontece SEM pacote novo, então o front só fica sabendo por
     * aqui. Espelha o RELOAD que o PyDotBot manda quando o status muda.
     */
    emitStatus(address: string, status: number): void {
        this.server.emit(SocketEvents.RobotStatus, { address, status });
    }

}

