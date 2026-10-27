import { Body, Controller, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { BaseController } from 'src/Classes/Base/Base.Controller';
import { PositionModel } from 'src/Model/Position.Model';
import { JwtAuthGuard } from 'src/Auth/Guards/JwtAuth.Guard';
import { PositionService } from './Position.Service';
import { PositionCreateDto } from './DTO/position.create.dto';
import { PositionUpdateDto } from './DTO/position.update.dto';
import { PositionSchema } from './Schema/Position.Schema';

/**
 * GET /, GET /:uuid, DELETE /:uuid vêm do BaseController como estão.
 * create/update são sobrescritos só pra trocar `Partial<T>` pelo DTO
 * concreto - ver comentário no BaseController.
 */
@Controller('positions')
@ApiTags('Positions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class PositionController extends BaseController<PositionModel> {

    constructor(positionService: PositionService) {
        super(positionService);
    }

    @Post()
    @ApiBody(PositionSchema)
    async create(@Body() dto: PositionCreateDto): Promise<PositionModel> {
        return super.create(dto);
    }

    @Put(':uuid')
    @ApiBody(PositionSchema)
    async update(@Param('uuid') uuid: string, @Body() dto: PositionUpdateDto): Promise<PositionModel> {
        return super.update(uuid, dto);
    }
}
