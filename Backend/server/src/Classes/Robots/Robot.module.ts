import { RobotModel } from "src/Model/Robot.Model";
import { RobotController } from "./Robot.Controller";
import { RobotService } from "./Robot.Service";
import { RobotRepository } from "./Robot.Repository";
import { SequelizeModule } from '@nestjs/sequelize';
import { Module } from "@nestjs/common";
import { EdgeModule } from "../Edge/Edge.Module";

// TaskModel/PositionModel têm module próprio (Task.module.ts /
// Position.module.ts). Comandos saem pela borda (EdgeModule) - a API não fala
// mais com o hardware, ver AGENTS.md, "Divisão API × borda".
@Module({
    imports: [
        SequelizeModule.forFeature([RobotModel]),
        EdgeModule
    ],
    controllers: [RobotController],
    providers: [
        RobotService,
        RobotRepository,
    ],
    exports: [RobotService],
})
export class RobotModule {}
