import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { PositionModel } from "src/Model/Position.Model";
import { BaseRepository } from "src/Classes/Base/Base.Repository";

/**
 * CRUD básico vem do BaseRepository; aqui só o que é específico da Position.
 */
@Injectable()
export class PositionRepository extends BaseRepository<PositionModel> {

    constructor(
        @InjectModel(PositionModel) model: typeof PositionModel
    ) {
        super(model);
    }

    async getByRobotId(robotId: string): Promise<PositionModel[]> {
        return await this.model.findAll({ where: { robotId } });
    }
}
