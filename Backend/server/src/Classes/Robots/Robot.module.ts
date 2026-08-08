import { RobotModel } from "src/Model/Robot.Model";
import { RobotController } from "./Robot.Controller";
import { RobotService } from "./Robot.Service";
import { RobotRepository } from "./Robot.Repository";
import { SequelizeModule } from '@nestjs/sequelize';
import { Module } from "@nestjs/common";
import { GATEWAY_ADAPTER } from "src/adapter/GatewayAdapter.interface";
import { SimulatorGatewayAdapter } from "src/adapter/Simulator/SimulatorGateway.Adapter";
import { GatewayModule } from "../Gateway/Gateway.Module";

// TaskModel/PositionModel agora têm module próprio (Task.module.ts /
// Position.module.ts) - ver AGENTS.md, item 8 da lista de "Pendente".
// GATEWAY_ADAPTER: hoje aponta pro Simulador. Trocar por SerialGatewayAdapter
// aqui (um lugar só) quando o hardware entrar - ver AGENTS.md, bloco D.
@Module({
    imports: [
        SequelizeModule.forFeature([RobotModel]),
        GatewayModule
    ],
    controllers: [RobotController],
    providers: [
        RobotService,
        RobotRepository,
    ],
    exports: [RobotService],
})
export class RobotModule {}