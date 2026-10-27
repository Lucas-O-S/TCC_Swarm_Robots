import { Module } from "@nestjs/common";
import { RobotModule } from "../Robots/Robot.module";
import { TaskModule } from "../Tasks/Task.module";
import { OrchestratorService } from "./Orchestrator.Service";
import { OrchestratorController } from "./Orchestrator.Controller";
import { OrchestratorListener } from "./Orchestrator.Listener";
import { SwarmModule } from "../Swarm/Swarm.Module";


@Module({
    imports: [TaskModule, RobotModule, SwarmModule],
    controllers: [OrchestratorController],
    providers: [OrchestratorService, OrchestratorListener],
    exports: [OrchestratorService],
})
export class OrchestratorModule {}