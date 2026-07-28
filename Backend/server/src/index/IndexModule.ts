import { RobotModule } from "src/Classes/Robots/Robot.module";
import { UserModule } from "src/Classes/Users/User.module";
import { AuthModule } from "src/Auth/Auth.module";
import { TaskModule } from "src/Classes/Tasks/Task.module";
import { PositionModule } from "src/Classes/Positions/Position.module";
import { SwarmModule } from "src/Classes/Swarm/Swarm.Module";
import { OrquestratorModule } from "src/Classes/Orchestrator/Orquestrator.Module";

/**
 * Lista central de módulos de negócio (estilo ApiGameHit) - importada com
 * spread no app.module.ts. Adicionar módulos novos aqui em vez de em
 * app.module.ts direto.
 */
export const AllModules = [
    UserModule,
    AuthModule,
    RobotModule,
    TaskModule,
    PositionModule,
    SwarmModule,
    OrquestratorModule,
];
