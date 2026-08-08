import { Controller, Get, Param } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { SwarmService } from "./Swarm.Service";

/**
 * Expõe o estado "quente" da frota (o que o SwarmService acumula dos frames
 * recebidos). Endereçado por `address`, como as rotas de comando.
 */
@Controller('robots')
@ApiTags('Swarm')
export class SwarmController {

    constructor(private readonly swarmService: SwarmService) {}

    /** Último status decodificado que chegou do robô (posição, bateria, etc.). */
    @Get(':address/status')
    status(@Param('address') address: string) {
        return this.swarmService.getState(address);
    }
}
