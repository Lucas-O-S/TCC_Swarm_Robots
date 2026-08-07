import { Module } from "@nestjs/common";
import { GATEWAY_ADAPTER } from "src/adapter/GatewayAdapter.interface";
import { SimulatorGatewayAdapter } from "src/adapter/Simulator/SimulatorGateway.Adapter";
import { MariGatewayAdapter } from "src/adapter/Mari/MariGateway.Adapter";
import { MqttGatewayAdapter } from "src/adapter/Mqtt/MqttGateway.Adapter";

// Escolhe o transporte por env num ponto único (ver AGENTS.md, "Passo 4" e
// "Conexão com o RobotSwarmSimulator"):
//   GATEWAY_MODE=mari -> hardware real (serial/HDLC)
//   GATEWAY_MODE=mqtt -> RobotSwarmSimulator (frota simulada via broker MQTT)
//   qualquer outro valor (ou vazio) -> simulador fake (só loga hex)
// RobotModule/SwarmModule importam este módulo, então compartilham a mesma
// instância do adapter escolhido aqui.
const GatewayAdapterClass =
    process.env.GATEWAY_MODE === "mari" ? MariGatewayAdapter :
    process.env.GATEWAY_MODE === "mqtt" ? MqttGatewayAdapter :
    SimulatorGatewayAdapter;

@Module({
    imports: [],
    controllers: [],
    providers: [{ provide: GATEWAY_ADAPTER, useClass: GatewayAdapterClass }],
    exports: [GATEWAY_ADAPTER],
})
export class GatewayModule {}
