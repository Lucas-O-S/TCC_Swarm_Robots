import { Injectable } from "@nestjs/common";
import { BaseService } from "src/Classes/Base/Base.Service";
import { PositionModel } from "src/Model/Position.Model";
import { PositionRepository } from "./Position.Repository";

/**
 * CRUD básico (create/getOne/getAll/update/remove) vem do BaseService. Em
 * produção o histórico de posição normalmente é escrito pelo SwarmService
 * (throttled, ver AGENTS.md), não direto por um usuário - mas o CRUD
 * genérico fica disponível igual às outras entidades.
 */
@Injectable()
export class PositionService extends BaseService<PositionModel> {

    constructor(private readonly positionRepository: PositionRepository) {
        super(positionRepository);
    }

    async getByRobotId(robotId: string): Promise<PositionModel[]> {
        return await this.positionRepository.getByRobotId(robotId);
    }
}
