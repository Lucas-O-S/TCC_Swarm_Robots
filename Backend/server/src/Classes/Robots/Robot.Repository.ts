import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { RobotModel } from "src/Model/Robot.Model";
import { BaseRepository } from "src/Classes/Base/Base.Repository";

/**
 * Camada de acesso a dados: só chama o Sequelize. Regra de negócio
 * (validação, "existe?", etc.) fica no Service, nunca aqui - segue o mesmo
 * padrão usado no ApiGameHit (Controller -> Service -> Repository -> Model).
 * CRUD básico (insert/update/get/getAll/delete/exists) vem do BaseRepository;
 * aqui só o que é específico do Robot.
 */
@Injectable()
export class RobotRepository extends BaseRepository<RobotModel> {

    constructor(
        @InjectModel(RobotModel) model: typeof RobotModel
    ) {
        super(model);
    }

    async getByAddress(address: string): Promise<RobotModel | null> {
        return await this.model.findOne({ where: { address } });
    }
}
