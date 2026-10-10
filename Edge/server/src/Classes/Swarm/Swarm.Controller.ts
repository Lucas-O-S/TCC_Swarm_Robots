import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { EdgeTokenGuard } from "src/Classes/Auth/EdgeToken.Guard";
import { SwarmService } from "./Swarm.Service";

/**
 * Leitura do estado vivo da frota. Serve também pra um cliente que acabou de
 * conectar no socket.io se sincronizar antes de passar a ouvir os eventos.
 */
@Controller('robots')
@ApiTags('Robots')
@ApiBearerAuth()
@UseGuards(EdgeTokenGuard)
export class SwarmController {

    constructor(private readonly swarmService: SwarmService) {}

    /** Todos os robôs que a borda já ouviu, com status e último dado. */
    @Get()
    list() {
        return this.swarmService.getAll();
    }

    /** Um robô: status e último dado decodificado (posição, bateria...). */
    @Get(':address')
    one(@Param('address') address: string) {
        return this.swarmService.getSnapshot(address);
    }
}
