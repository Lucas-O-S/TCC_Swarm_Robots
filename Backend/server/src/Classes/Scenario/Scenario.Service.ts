import { Injectable, NotFoundException } from "@nestjs/common";
import { BaseService } from "src/Classes/Base/Base.Service";
import { ScenarioModel } from "src/Model/Scenario.Model";
import { ScenarioRepository } from "./Scenario.Repository";

/** Campos da área, que vêm da borda (nome, descrição e obstáculos são do usuário). */
export type ScenarioAreaFields = Pick<ScenarioModel,
    "sizeX" | "sizeY" | "areaSource" | "areaLayout" | "areaX" | "areaY"
    | "calibrationX" | "calibrationY" | "calibrationWidth" | "calibrationHeight"
    | "calibrationChannels" | "calibrationVersion" | "calibrationFile">;

/**
 * CRUD básico (getOne/getAll/update/remove) vem do BaseService; os obstáculos
 * vão junto porque o ScenarioRepository já trata isso. Criar não é do
 * usuário: o cenário de cada gateway nasce e tem a área atualizada pela borda
 * (applyEdgeArea, chamado pelo GatewayService).
 */
@Injectable()
export class ScenarioService extends BaseService<ScenarioModel> {

    constructor(private readonly scenarioRepository: ScenarioRepository) {
        super(scenarioRepository);
    }

    /** Cenário (mapa) do gateway; 404 se a borda ainda não mandou área. */
    async getByGateway(gatewayId: string): Promise<ScenarioModel> {
        const scenario = await this.scenarioRepository.getByGateway(gatewayId);
        if (!scenario) throw new NotFoundException(`Gateway ${gatewayId} ainda não tem cenário (a borda não mandou área)`);
        return scenario;
    }

    /**
     * Área nova da borda para o cenário do gateway: cria na primeira vez (com
     * `defaultName`), senão atualiza só a área - o resto é do usuário.
     * Devolve o cenário quando mudou algo; null se a área é a mesma
     * (reconexão manda a mesma de novo).
     */
    async applyEdgeArea(gatewayId: string, defaultName: string, fields: ScenarioAreaFields): Promise<ScenarioModel | null> {
        const current = await this.scenarioRepository.getByGateway(gatewayId);

        if (!current) {
            const created = await this.scenarioRepository.insert({
                name: defaultName,
                description: "Mapa criado pela borda",
                gatewayId,
                ...fields,
            });
            return await this.scenarioRepository.get(created.uuid);
        }

        if (ScenarioService.sameArea(current, fields)) return null;

        await this.scenarioRepository.update(fields, current.uuid);
        return await this.scenarioRepository.get(current.uuid);
    }

    private static sameArea(current: ScenarioModel, next: ScenarioAreaFields): boolean {
        return (Object.keys(next) as (keyof ScenarioAreaFields)[]).every((key) =>
            key === "calibrationChannels"
                ? JSON.stringify(current.calibrationChannels ?? null) === JSON.stringify(next.calibrationChannels ?? null)
                : (current[key] ?? null) === (next[key] ?? null)
        );
    }
}
