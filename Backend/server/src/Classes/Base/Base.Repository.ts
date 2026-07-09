import { FindOptions, Model, ModelStatic, WhereOptions } from "sequelize";

/**
 * CRUD genérico sobre um model Sequelize com `uuid` como PK (todo model
 * concreto estende `BaseModel`, ver Model/Base.Model.ts). Cada Repository
 * concreto estende esta classe e só declara os métodos que fogem do básico
 * (ex.: `getByAddress` do RobotRepository) - evita repetir
 * insert/update/get/getAll/delete/exists em cada Repository.
 */
export abstract class BaseRepository<T extends Model> {

    protected constructor(protected readonly model: ModelStatic<T>) {}

    async insert(dto: Partial<T>): Promise<T> {
        return await this.model.create(dto as any);
    }

    async update(dto: Partial<T>, uuid: string): Promise<boolean> {
        const [affectedRows] = await this.model.update(dto as any, {
            where: { uuid } as WhereOptions<T>,
        });

        return affectedRows > 0;
    }

    async get(uuid: string): Promise<T | null> {
        return await this.model.findByPk(uuid);
    }

    async getAll(options?: FindOptions<T>): Promise<T[]> {
        return await this.model.findAll(options);
    }

    async delete(uuid: string): Promise<boolean> {
        return (await this.model.destroy({ where: { uuid } as WhereOptions<T> })) > 0;
    }

    async exists(uuid: string): Promise<boolean> {
        return (await this.model.findByPk(uuid)) != null;
    }
}
