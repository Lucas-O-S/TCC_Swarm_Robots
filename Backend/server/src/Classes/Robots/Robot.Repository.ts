import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Op } from "sequelize";
import { RobotModel } from "src/Model/Robot.Model";
import { BaseRepository } from "src/Classes/Base/Base.Repository";
import { RobotControlMode } from "src/Enums/RobotControlMode.enum";
import { RobotStatus } from "src/Enums/RobotStatus.enum";

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

    async getFreeRobots(): Promise<RobotModel[] | null> {
        return await this.model.findAll({
            where: {
                [Op.and] : [
                    { taskId: { [Op.is]: null } },
                    { mode: RobotControlMode.Auto },
                    { status: { [Op.ne]: RobotStatus.Lost} }       
                ]
            }
        });
    }

}
