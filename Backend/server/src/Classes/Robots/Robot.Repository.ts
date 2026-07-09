import { InjectModel } from "@nestjs/sequelize";
import { RobotModel } from "src/Model/Robot.Model";

/**
 * Camada de acesso a dados: só chama o Sequelize. Regra de negócio
 * (validação, "existe?", etc.) fica no Service, nunca aqui - segue o mesmo
 * padrão usado no ApiGameHit (Controller -> Service -> Repository -> Model).
 */
export class RobotRepository {

    constructor(
        @InjectModel(RobotModel) private readonly model: typeof RobotModel
    ) {}

    async insert(dto: Partial<RobotModel>): Promise<RobotModel> {
        return await this.model.create(dto as RobotModel);
    }

    async update(dto: Partial<RobotModel>, uuid: string): Promise<boolean> {
        const [affectedRows] = await this.model.update(dto, { where: { uuid } });

        return affectedRows > 0;
    }

    async get(uuid: string): Promise<RobotModel | null> {
        return await this.model.findByPk(uuid);
    }

    async getByAddress(address: string): Promise<RobotModel | null> {
        return await this.model.findOne({ where: { address } });
    }

    async getAll(): Promise<RobotModel[]> {
        return await this.model.findAll();
    }

    async delete(uuid: string): Promise<boolean> {
        return (await this.model.destroy({ where: { uuid } })) > 0;
    }

    async exists(uuid: string): Promise<boolean> {
        return (await this.model.findByPk(uuid)) != null;
    }
}
