import { Module } from "@nestjs/common";
import { SwarmModule } from "../Swarm/Swarm.Module";
import { CommandModule } from "../Commands/Command.Module";
import { UplinkModule } from "../Uplink/Uplink.Module";
import { UplinkBridge } from "./Bridge.Service";

@Module({
    imports: [UplinkModule, SwarmModule, CommandModule],
    providers: [UplinkBridge],
})
export class UplinkBridgeModule {}
