import { Body, Controller, MethodNotAllowedException, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { BaseController } from 'src/Classes/Base/Base.Controller';
import { ScenarioModel } from 'src/Model/Scenario.Model';
import { JwtAuthGuard } from 'src/Auth/Guards/JwtAuth.Guard';
import { ScenarioService } from './Scenario.Service';
import { ScenarioUpdateDto } from './DTO/scenario.update.dto';
import { ScenarioSchema } from './Schema/Scenario.Schema';

/**
 * GET /, GET /:uuid, DELETE /:uuid vêm do BaseController como estão.
 * update é sobrescrito só pra trocar `Partial<T>` pelo DTO concreto - ver
 * comentário no BaseController. Obstáculos vão no body do Scenario (campo
 * `obstacles`), sem rota própria.
 *
 * create é sobrescrito para recusar (405): o cenário de cada gateway é criado
 * e tem a área atualizada pela borda (GatewayService). Um cenário de gateway
 * apagado volta na próxima área que a borda mandar.
 */
@Controller('scenarios')
@ApiTags('Scenarios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class ScenarioController extends BaseController<ScenarioModel, ScenarioUpdateDto> {

    constructor(scenarioService: ScenarioService) {
        super(scenarioService);
    }

    @Post()
    async create(): Promise<ScenarioModel> {
        throw new MethodNotAllowedException("Cenário é criado pela borda: cada gateway ganha o seu quando manda a área");
    }

    @Put(':uuid')
    @ApiBody(ScenarioSchema)
    async update(@Param('uuid') uuid: string, @Body() dto: ScenarioUpdateDto): Promise<ScenarioModel> {
        return super.update(uuid, dto);
    }
}
