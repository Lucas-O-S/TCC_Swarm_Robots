import { Module } from "@nestjs/common";
import { EdgeClient } from "./Edge.Client";

/**
 * Cliente da borda. RobotModule e SwarmModule importam este módulo e
 * compartilham a mesma instância (uma conexão socket.io só).
 */
@Module({
    providers: [EdgeClient],
    exports: [EdgeClient],
})
export class EdgeModule {}
