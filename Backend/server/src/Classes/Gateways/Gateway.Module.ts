import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";
import { GatewayModel } from "src/Model/Gateway.Model";
import { EdgeModule } from "../Edge/Edge.Module";
import { ScenarioModule } from "../Scenario/Scenario.Module";
import { GatewayController } from "./Gateway.Controller";
import { GatewayRepository } from "./Gateway.Repository";
import { GatewayService } from "./Gateway.Service";

@Module({
    imports: [SequelizeModule.forFeature([GatewayModel]), EdgeModule, ScenarioModule],
    controllers: [GatewayController],
    providers: [GatewayService, GatewayRepository],
    exports: [GatewayService],
})
export class GatewayModule {}
