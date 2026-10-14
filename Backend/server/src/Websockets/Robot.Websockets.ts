import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server } from "socket.io";
import { SocketEvents } from "src/Enums/SocketEvents.enum";
import { RobotStatus } from "src/Enums/RobotStatus.enum";
import { RobotModel } from "src/Model/Robot.Model";
import { RobotNewEvent, RobotStatusEvent, RobotUpdateEvent } from "./Socket.Events";


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

    /** Estado novo do robô (posição, bateria...), já no formato do front. */
    emitUpdate(event: RobotUpdateEvent): void {
        this.server.emit(SocketEvents.RobotUpdate, event);
    }

    /**
     * Mudança de status calculada pelo SwarmService (Active/Inactive/Lost por
     * silêncio) - acontece SEM pacote novo, então o front só fica sabendo por
     * aqui. Espelha o RELOAD que o PyDotBot manda quando o status muda.
     */
    emitStatus(address: string, status: RobotStatus): void {
        const event: RobotStatusEvent = { address, status };
        this.server.emit(SocketEvents.RobotStatus, event);
    }

    /**
     * Robô recém-descoberto na rede (cadastrado no primeiro anúncio). Manda o
     * RobotModel inteiro pro front poder desenhar o marcador sem refetch -
     * canal separado do robot:status (que é só mudança de status de robô já
     * conhecido). Mirror do NEW_DOTBOT do PyDotBot.
     */
    emitNew(robot: RobotModel): void {
        const event: RobotNewEvent = { robot };
        this.server.emit(SocketEvents.RobotNew, event);
    }

}

