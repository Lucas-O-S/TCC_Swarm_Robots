import { Body, Controller, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { BaseController } from 'src/Classes/Base/Base.Controller';
import { ScenarioModel } from 'src/Model/Scenario.Model';
import { JwtAuthGuard } from 'src/Auth/Guards/JwtAuth.Guard';
import { ScenarioService } from './Scenario.Service';
import { ScenarioCreateDto } from './DTO/scenario.create.dto';
import { ScenarioUpdateDto } from './DTO/scenario.update.dto';
import { ScenarioSchema } from './Schema/Scenario.Schema';

/**
 * GET /, GET /:uuid, DELETE /:uuid vêm do BaseController como estão.
 * create/update são sobrescritos só pra trocar `Partial<T>` pelo DTO
 * concreto - ver comentário no BaseController. Obstáculos vão no body do
 * Scenario (campo `obstacles`), sem rota própria.
 */
@Controller('scenarios')
@ApiTags('Scenarios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class ScenarioController extends BaseController<ScenarioModel, ScenarioCreateDto> {

    constructor(scenarioService: ScenarioService) {
        super(scenarioService);
    }

    @Post()
    @ApiBody(ScenarioSchema)
    async create(@Body() dto: ScenarioCreateDto): Promise<ScenarioModel> {
        return super.create(dto);
    }

    @Put(':uuid')
    @ApiBody(ScenarioSchema)
    async update(@Param('uuid') uuid: string, @Body() dto: ScenarioUpdateDto): Promise<ScenarioModel> {
        return super.update(uuid, dto);
    }
}
