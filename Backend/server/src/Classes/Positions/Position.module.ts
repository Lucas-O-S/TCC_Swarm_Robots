import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";
import { PositionModel } from "src/Model/Position.Model";
import { PositionController } from "./Position.Controller";
import { PositionService } from "./Position.Service";
import { PositionRepository } from "./Position.Repository";

@Module({
    imports: [
        SequelizeModule.forFeature([PositionModel]),
    ],
    controllers: [PositionController],
    providers: [PositionService, PositionRepository],
    exports: [PositionService],
})
export class PositionModule {}
