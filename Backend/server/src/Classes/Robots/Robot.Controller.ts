import { Body, Controller, Param, Post, Put } from '@nestjs/common';
import { BaseController } from 'src/Classes/Base/Base.Controller';
import { RobotModel } from 'src/Model/Robot.Model';
import { RobotService } from './Robot.Service';
import { RobotCreateDto } from './DTO/robot.create.dto';
import { RobotUpdateDto } from './DTO/robot.update.dto';

/**
 * GET /, GET /:uuid, DELETE /:uuid vêm do BaseController como estão.
 * create/update são sobrescritos só pra trocar `Partial<T>` (generico, sem
 * metadata em runtime) pelo DTO concreto - ver comentário no
 * BaseController sobre por que isso é necessário pro ValidationPipe validar.
 * Rotas específicas do protocolo (move-raw, rgb-led, waypoints, GET por
 * address) entram aqui depois - ver AGENTS.md.
 */
@Controller('robots')
export class RobotController extends BaseController<RobotModel> {

    constructor(robotService: RobotService) {
        super(robotService);
    }

    @Post()
    async create(@Body() dto: RobotCreateDto): Promise<RobotModel> {
        return super.create(dto);
    }

    @Put(':uuid')
    async update(@Param('uuid') uuid: string, @Body() dto: RobotUpdateDto): Promise<RobotModel> {
        return super.update(uuid, dto);
    }
}