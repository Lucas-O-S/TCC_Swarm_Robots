import { Module } from "@nestjs/common";
import { RobotModule } from "../Robots/Robot.module";
import { TaskModule } from "../Tasks/Task.module";
import { OrchestratorService } from "./Orchestrator.Service";


@Module({
    imports: [TaskModule, RobotModule],
    controllers: [],
    providers: [OrchestratorService],
    exports: [OrchestratorService],
})
export class OrchestratorModule {}