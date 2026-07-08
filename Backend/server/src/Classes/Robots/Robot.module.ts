import { RobotModel } from "src/Model/Robot.Model";
import { TaskModel } from "src/Model/Task.Model";
import { PositionModel } from "src/Model/Position.Model";
import { RobotController } from "./Robot.Controller";
import { RobotService } from "./Robot.Service";
import { RobotRepository } from "./Robot.Repository";
import { SequelizeModule } from '@nestjs/sequelize';
import { Module } from "@nestjs/common";

// TaskModel e PositionModel estão registrados aqui só porque ainda não
// existe um TaskModule/PositionModule dedicado (mirror do que o ApiGameHit
// faz: cada entidade eventualmente ganha seu próprio module - ver AGENTS.md).
@Module({
    imports: [
        SequelizeModule.forFeature([RobotModel, TaskModel, PositionModel]),
    ],
    controllers: [RobotController],
    providers: [RobotService, RobotRepository],
    exports: [RobotService],
})
export class RobotModule {


}