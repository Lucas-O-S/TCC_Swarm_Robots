import { Body, Controller, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/Auth/Guards/JwtAuth.Guard';
import { OrchestratorService } from './Orchestrator.Service';
import { AssignTaskDto } from './DTO/assign.task.dto';
import { AssignTaskSchema } from './Schema/AssignTask.Schema';

/**
 * Rotas do orquestrador acionadas por humano. Hoje só a atribuição manual de
 * task - usada tipicamente com robô em modo SemiAuto (autônomo, mas fora da
 * fila automática do orquestrador). O loop automático (assignPending) continua
 * sem controller, rodando sozinho por timer.
 */
@Controller('orchestrator')
@ApiTags('Orchestrator')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class OrchestratorController {

    constructor(private readonly orchestrator: OrchestratorService) {}

    /** Atribui manualmente uma task (com waypoints) a um robô, por address. */
    @Put('robots/:address/assign')
    @ApiBody(AssignTaskSchema)
    async assign(@Param('address') address: string, @Body() dto: AssignTaskDto) {
        await this.orchestrator.assignTaskManually(address, dto.taskId);
        return { address, taskId: dto.taskId };
    }
}
