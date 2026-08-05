import { Module } from "@nestjs/common";
import { GATEWAY_ADAPTER } from "src/adapter/GatewayAdapter.interface";
import { SimulatorGatewayAdapter } from "src/adapter/Simulator/SimulatorGateway.Adapter";
import { MariGatewayAdapter } from "src/adapter/Mari/MariGateway.Adapter";

// Escolhe o transporte por env num ponto único (ver AGENTS.md, "Passo 4").
// GATEWAY_MODE=mari usa o hardware real (serial); qualquer outro valor cai no
// simulador. RobotModule/SwarmModule importam este módulo, então compartilham
// a mesma instância do adapter escolhido aqui.
const GatewayAdapterClass =
    process.env.GATEWAY_MODE === "mari" ? MariGatewayAdapter : SimulatorGatewayAdapter;

@Module({
    imports: [],
    controllers: [],
    providers: [{ provide: GATEWAY_ADAPTER, useClass: GatewayAdapterClass }],
    exports: [GATEWAY_ADAPTER],
})
export class GatewayModule {}
