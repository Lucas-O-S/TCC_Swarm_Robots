import { Module } from "@nestjs/common";
import { EdgeClient } from "./Edge.Client";
import { EdgeGateway } from "./Edge.Gateway";

/**
 * Cliente da borda. RobotModule e SwarmModule importam este módulo e
 * compartilham a mesma instância (uma conexão socket.io só).
 */
@Module({
    providers: [EdgeClient, EdgeGateway],
    exports: [EdgeClient],
})
export class EdgeModule {}
