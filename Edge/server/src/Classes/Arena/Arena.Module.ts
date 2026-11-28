import { Module } from "@nestjs/common";
import { GatewayModule } from "../Gateway/Gateway.Module";
import { SwarmModule } from "../Swarm/Swarm.Module";
import { UplinkModule } from "../Uplink/Uplink.Module";
import { ArenaController } from "./Arena.Controller";
import { ArenaService } from "./Arena.Service";

@Module({
    imports: [GatewayModule, UplinkModule, SwarmModule],
    controllers: [ArenaController],
    providers: [ArenaService],
})
export class ArenaModule {}
