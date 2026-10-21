import { Module } from "@nestjs/common";
import { GatewayModule } from "../Gateway/Gateway.Module";
import { Lh2Controller } from "./Lh2.Controller";
import { Lh2Service } from "./Lh2.Service";

@Module({
    imports: [GatewayModule],
    controllers: [Lh2Controller],
    providers: [Lh2Service],
})
export class Lh2Module {}
