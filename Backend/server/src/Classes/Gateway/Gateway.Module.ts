import { Module } from "@nestjs/common";
import { GATEWAY_ADAPTER } from "src/adapter/GatewayAdapter.interface";
import { SimulatorGatewayAdapter } from "src/adapter/Simulator/SimulatorGateway.Adapter";


@Module({
    imports: [],
    controllers: [],
    providers: [{provide : GATEWAY_ADAPTER, useClass: SimulatorGatewayAdapter} ],
    exports: [GATEWAY_ADAPTER],
})
export class GatewayModule {}