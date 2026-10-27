import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { FindOptions } from "sequelize";
import { BaseRepository } from "src/Classes/Base/Base.Repository";
import { ScenarioModel } from "src/Model/Scenario.Model";
import { ObstacleModel } from "src/Model/Obstacle.Model";


@Injectable()
export class ScenarioRepository extends BaseRepository<ScenarioModel> {

    constructor(
        @InjectModel(ScenarioModel) model: typeof ScenarioModel,
        @InjectModel(ObstacleModel) private readonly obstacleModel: typeof ObstacleModel,
    ) {
        super(model);
    }

    async insert(dto: Partial<ScenarioModel>): Promise<ScenarioModel> {
        return await this.model.sequelize!.transaction(async (transaction) =>
            await this.model.create(dto as any, { include: [ObstacleModel], transaction })
        );
    }

    async update(dto: Partial<ScenarioModel>, uuid: string): Promise<boolean> {
        const { obstacles, ...fields } = dto;

        return await this.model.sequelize!.transaction(async (transaction) => {
            const [affectedRows] = await this.model.update(fields as any, {
                where: { uuid },
                transaction,
            });

            if (obstacles !== undefined) {
                await this.obstacleModel.destroy({ where: { scenarioId: uuid }, transaction });
                await this.obstacleModel.bulkCreate(
                    obstacles.map((obstacle) => ({ ...obstacle, scenarioId: uuid })) as any,
                    { transaction },
                );
            }

            return affectedRows > 0;
        });
    }

    async get(uuid: string): Promise<ScenarioModel | null> {
        return await this.model.findByPk(uuid, { include: [ObstacleModel] });
    }

    async getAll(options?: FindOptions<ScenarioModel>): Promise<ScenarioModel[]> {
        return await super.getAll({ include: [ObstacleModel], ...options });
    }

    /** Paranoid não cascateia: apaga (soft) os obstáculos junto com o cenário. */
    async delete(uuid: string): Promise<boolean> {
        return await this.model.sequelize!.transaction(async (transaction) => {
            await this.obstacleModel.destroy({ where: { scenarioId: uuid }, transaction });
            return (await this.model.destroy({ where: { uuid }, transaction })) > 0;
        });
    }
}
