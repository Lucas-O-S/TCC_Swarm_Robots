import { Module } from "@nestjs/common";
import { GATEWAY_ADAPTER } from "src/adapter/GatewayAdapter.interface";
import { SimulatorGatewayAdapter } from "src/adapter/Simulator/SimulatorGateway.Adapter";
import { MariGatewayAdapter } from "src/adapter/Mari/MariGateway.Adapter";
import { MqttGatewayAdapter } from "src/adapter/Mqtt/MqttGateway.Adapter";
import { gatewayConfig } from "src/config/gateway.config";

// Escolhe o transporte pelo GATEWAY_MODE (gatewayConfig.mode; ver AGENTS.md na
// raiz, "Passo 4" e "Conexão com o RobotSwarmSimulator").
// CommandModule/SwarmModule importam este módulo, então compartilham a mesma
// instância do adapter escolhido aqui.
const GatewayAdapterClass =
    gatewayConfig.mode === "mari" ? MariGatewayAdapter :
    gatewayConfig.mode === "mqtt" ? MqttGatewayAdapter :
    SimulatorGatewayAdapter;

@Module({
    imports: [],
    controllers: [],
    providers: [{ provide: GATEWAY_ADAPTER, useClass: GatewayAdapterClass }],
    exports: [GATEWAY_ADAPTER],
})
export class GatewayModule {}
