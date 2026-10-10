import { Module } from "@nestjs/common";
import { GatewayModule } from "../Gateway/Gateway.Module";
import { CommandController } from "./Command.Controller";
import { CommandService } from "./Command.Service";

@Module({
    imports: [GatewayModule],
    controllers: [CommandController],
    providers: [CommandService],
    exports: [CommandService],
})
export class CommandModule {}
