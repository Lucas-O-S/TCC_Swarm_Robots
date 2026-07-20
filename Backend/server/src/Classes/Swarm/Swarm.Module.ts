import { Module } from "@nestjs/common";
import { GatewayModule } from "../Gateway/Gateway.Module";
import { SwarmController } from "./Swarm.Controller";
import { SwarmService } from "./Swarm.Service";

@Module({
    imports: [GatewayModule],
    controllers: [SwarmController],
    providers: [SwarmService],
    exports: [SwarmService],
})
export class SwarmModule {}
