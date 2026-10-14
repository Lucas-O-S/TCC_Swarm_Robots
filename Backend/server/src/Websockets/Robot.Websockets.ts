import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server } from "socket.io";
import { SocketEvents } from "src/Enums/SocketEvents.enum";
import { RobotStatus } from "src/Enums/RobotStatus.enum";
import { RobotModel } from "src/Model/Robot.Model";
import { RobotNewEvent, RobotStatusEvent, RobotUpdateEvent, RobotUpdatesEvent } from "./Socket.Events";

/** Janela do lote do `robot:updates`: ~10 envios/s, independente de quantos robôs. */
const UPDATES_FLUSH_MS = 100;


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

    private pendingUpdates: RobotUpdateEvent[] = [];

    private flushTimer: NodeJS.Timeout | null = null;

    /**
     * Estado novo do robô (posição, bateria...), já no formato do front. Não
     * sai na hora: entra no lote e vai no próximo `robot:updates`
     * (até UPDATES_FLUSH_MS depois).
     */
    queueUpdate(event: RobotUpdateEvent): void {
        this.pendingUpdates.push(event);
        this.flushTimer ??= setTimeout(() => this.flushUpdates(), UPDATES_FLUSH_MS);
    }

    private flushUpdates(): void {
        this.flushTimer = null;
        if (this.pendingUpdates.length === 0) return;
        const event: RobotUpdatesEvent = { updates: this.pendingUpdates };
        this.pendingUpdates = [];
        this.server.emit(SocketEvents.RobotUpdates, event);
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

