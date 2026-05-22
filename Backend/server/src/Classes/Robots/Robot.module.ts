import { RobotModel } from "src/Model/Robot.Model";
import { RobotController } from "./Robot.Controller";
import { RobotService } from "./Robot.Service"; 
import { SequelizeModule } from '@nestjs/sequelize';
import { Module } from "@nestjs/common";

@Module({
    imports: [
        SequelizeModule.forFeature([RobotModel]),
    ],
    controllers: [RobotController],
    providers: [RobotModel, RobotService],
})
export class RobotModule {


}