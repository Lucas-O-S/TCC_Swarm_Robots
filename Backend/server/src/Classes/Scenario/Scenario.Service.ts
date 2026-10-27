import { Injectable } from "@nestjs/common";
import { BaseService } from "src/Classes/Base/Base.Service";
import { ScenarioModel } from "src/Model/Scenario.Model";
import { ScenarioRepository } from "./Scenario.Repository";

/**
 * CRUD básico (create/getOne/getAll/update/remove) vem do BaseService; os
 * obstáculos vão junto porque o ScenarioRepository já trata isso.
 */
@Injectable()
export class ScenarioService extends BaseService<ScenarioModel> {

    constructor(private readonly scenarioRepository: ScenarioRepository) {
        super(scenarioRepository);
    }
}
