import { Module } from "@nestjs/common";
import { OrquestratorService } from "./Orquestrator.Service";
import { RobotModule } from "../Robots/Robot.module";
import { TaskModule } from "../Tasks/Task.module";


@Module({
    imports: [TaskModule, RobotModule],
    controllers: [],
    providers: [OrquestratorService],
    exports: [OrquestratorService],
})
export class OrquestratorModule {}