import { RobotModule } from "src/Classes/Robots/Robot.module";
import { UserModule } from "src/Classes/Users/User.module";
import { AuthModule } from "src/Auth/Auth.module";

/**
 * Lista central de módulos de negócio (estilo ApiGameHit) - importada com
 * spread no app.module.ts. Adicionar módulos novos aqui em vez de em
 * app.module.ts direto.
 */
export const AllModules = [
    UserModule,
    AuthModule,
    RobotModule,
];
