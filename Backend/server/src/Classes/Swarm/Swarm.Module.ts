import { Module } from "@nestjs/common";
import { GatewayModule } from "../Gateway/Gateway.Module";
import { SwarmController } from "./Swarm.Controller";
import { SwarmService } from "./Swarm.Service";
import { SwarmGateway } from "./Swarm.Gateway";

@Module({
    imports: [GatewayModule],
    controllers: [SwarmController],
    providers: [SwarmService, SwarmGateway],
    exports: [SwarmService],
})
export class SwarmModule {}
