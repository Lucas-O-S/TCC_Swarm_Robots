import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/Auth/Guards/JwtAuth.Guard';
import { OrchestratorService } from './Orchestrator.Service';
import { AssignTaskDto } from './DTO/assign.task.dto';
import { AssignTaskSchema } from './Schema/AssignTask.Schema';
import { AutoToggleDto } from './DTO/auto.toggle.dto';
import { AutoToggleSchema } from './Schema/AutoToggle.Schema';

/**
 * Rotas do orquestrador acionadas por humano: a atribuição manual de task -
 * usada tipicamente com robô em modo SemiAuto (autônomo, mas fora da fila
 * automática do orquestrador) - e o liga/desliga da atribuição automática.
 * O loop automático (assignPending) em si roda sozinho por timer.
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

    /** Diz se a atribuição automática está ligada. */
    @Get('auto')
    auto() {
        return { enabled: this.orchestrator.isAutoEnabled() };
    }

    /**
     * Liga/desliga a atribuição automática em runtime (o estado inicial vem de
     * ORCHESTRATOR_AUTO). Não mexe no SemiAuto nem nas tasks em andamento.
     */
    @Put('auto')
    @ApiBody(AutoToggleSchema)
    setAuto(@Body() dto: AutoToggleDto) {
        this.orchestrator.setAutoEnabled(dto.enabled);
        return { enabled: this.orchestrator.isAutoEnabled() };
    }
}
