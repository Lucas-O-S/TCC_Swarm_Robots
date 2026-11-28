import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "src/Auth/Guards/JwtAuth.Guard";
import { ScenarioModel } from "src/Model/Scenario.Model";
import { GatewayModel } from "src/Model/Gateway.Model";
import { GatewayService } from "./Gateway.Service";

/**
 * Gateways (bordas + transporte + rede) e o mapa (cenário) de cada um. Só
 * leitura: quem cria e atualiza é a própria borda, pelo /edge. Os obstáculos
 * do mapa se editam em PUT /scenarios/:uuid.
 */
@Controller("gateways")
@ApiTags("Gateways")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class GatewayController {

    constructor(private readonly gatewayService: GatewayService) {}

    @Get()
    async getAll(): Promise<GatewayModel[]> {
        return await this.gatewayService.getAll();
    }

    @Get(":uuid")
    async getOne(@Param("uuid") uuid: string): Promise<GatewayModel> {
        return await this.gatewayService.getOne(uuid);
    }

    /** Mapa do gateway: área (vinda da borda) + obstáculos. */
    @Get(":uuid/scenario")
    async getScenario(@Param("uuid") uuid: string): Promise<ScenarioModel> {
        return await this.gatewayService.getScenario(uuid);
    }
}
