import { Server } from "tls";
import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";


@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class RobotWebsockets {


    @WebSocketServer()
    private server: Server;

    emitUpdate(address: string, state: any): void {
        this.server.emit("robot:update", { address, state });

    }

}

