import { Module } from "@nestjs/common";
import { GatewayModule } from "../Gateway/Gateway.Module";
import { SwarmController } from "./Swarm.Controller";
import { SwarmService } from "./Swarm.Service";
import { RobotWebsockets } from "src/Websockets/Robot.Websockets";
import { RobotModule } from "../Robots/Robot.module";

@Module({
    imports: [GatewayModule, RobotModule],
    controllers: [SwarmController],
    providers: [SwarmService, RobotWebsockets],
    exports: [SwarmService],
})
export class SwarmModule {}
