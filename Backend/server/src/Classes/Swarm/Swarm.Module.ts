import { Module } from "@nestjs/common";
import { GatewayModule } from "../Gateway/Gateway.Module";
import { SwarmController } from "./Swarm.Controller";
import { SwarmService } from "./Swarm.Service";
import { RobotWebsockets } from "src/Websockets/Robot.Websockets";

@Module({
    imports: [GatewayModule],
    controllers: [SwarmController],
    providers: [SwarmService, RobotWebsockets],
    exports: [SwarmService],
})
export class SwarmModule {}
