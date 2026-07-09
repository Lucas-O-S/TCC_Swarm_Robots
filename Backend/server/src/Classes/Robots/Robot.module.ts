import { RobotModel } from "src/Model/Robot.Model";
import { RobotController } from "./Robot.Controller";
import { RobotService } from "./Robot.Service";
import { RobotRepository } from "./Robot.Repository";
import { SequelizeModule } from '@nestjs/sequelize';
import { Module } from "@nestjs/common";

// TaskModel/PositionModel agora têm module próprio (Task.module.ts /
// Position.module.ts) - ver AGENTS.md, item 8 da lista de "Pendente".
@Module({
    imports: [
        SequelizeModule.forFeature([RobotModel]),
    ],
    controllers: [RobotController],
    providers: [RobotService, RobotRepository],
    exports: [RobotService],
})
export class RobotModule {}