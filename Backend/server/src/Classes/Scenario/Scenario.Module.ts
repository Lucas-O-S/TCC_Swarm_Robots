import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";
import { ScenarioModel } from "src/Model/Scenario.Model";
import { ObstacleModel } from "src/Model/Obstacle.Model";
import { ScenarioController } from "./Scenario.Controller";
import { ScenarioService } from "./Scenario.Service";
import { ScenarioRepository } from "./Scenario.Repository";

@Module({
    imports: [
        SequelizeModule.forFeature([ScenarioModel, ObstacleModel]),
    ],
    controllers: [ScenarioController],
    providers: [ScenarioService, ScenarioRepository],
    exports: [ScenarioService],
})
export class ScenarioModule {}
