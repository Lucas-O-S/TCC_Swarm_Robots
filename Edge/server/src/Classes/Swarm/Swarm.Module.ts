import { Module } from "@nestjs/common";
import { GatewayModule } from "../Gateway/Gateway.Module";
import { SwarmController } from "./Swarm.Controller";
import { SwarmService } from "./Swarm.Service";
import { EdgeWebsockets } from "src/Websockets/Edge.Websockets";

@Module({
    imports: [GatewayModule],
    controllers: [SwarmController],
    providers: [SwarmService, EdgeWebsockets],
    exports: [SwarmService],
})
export class SwarmModule {}
