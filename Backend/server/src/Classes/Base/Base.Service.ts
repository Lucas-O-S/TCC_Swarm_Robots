import { NotFoundException } from "@nestjs/common";
import { Model } from "sequelize";
import { BaseRepository } from "src/Classes/Base/Base.Repository";

/**
 * Regra de negócio genérica em cima de um BaseRepository: "existe?", lançar
 * 404 quando não existe, etc. Cada Service concreto estende esta classe e só
 * declara o que é específico da entidade - mirror do que o BaseRepository já
 * faz pro lado de acesso a dados.
 */
export abstract class BaseService<T extends Model> {

    protected constructor(protected readonly repository: BaseRepository<T>) {}

    async create(dto: Partial<T>): Promise<T> {
        return await this.repository.insert(dto);
    }

    async getOne(uuid: string): Promise<T> {
        const entity = await this.repository.get(uuid);
        if (!entity) {
            throw new NotFoundException(`Registro ${uuid} não encontrado`);
        }
        return entity;
    }

    async getAll(): Promise<T[]> {
        return await this.repository.getAll();
    }

    async update(uuid: string, dto: Partial<T>): Promise<T> {
        await this.ensureExists(uuid);
        await this.repository.update(dto, uuid);
        return await this.getOne(uuid);
    }

    async remove(uuid: string): Promise<void> {
        await this.ensureExists(uuid);
        await this.repository.delete(uuid);
    }

    protected async ensureExists(uuid: string): Promise<void> {
        if (!(await this.repository.exists(uuid))) {
            throw new NotFoundException(`Registro ${uuid} não encontrado`);
        }
    }
}
