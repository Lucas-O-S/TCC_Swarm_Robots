import { Module } from "@nestjs/common";
import { RobotModule } from "../Robots/Robot.module";
import { TaskModule } from "../Tasks/Task.module";
import { OrchestratorService } from "./Orchestrator.Service";
import { OrchestratorController } from "./Orchestrator.Controller";
import { OrchestratorListener } from "./Orchestrator.Listener";


@Module({
    imports: [TaskModule, RobotModule],
    controllers: [OrchestratorController],
    providers: [OrchestratorService, OrchestratorListener],
    exports: [OrchestratorService],
})
export class OrchestratorModule {}