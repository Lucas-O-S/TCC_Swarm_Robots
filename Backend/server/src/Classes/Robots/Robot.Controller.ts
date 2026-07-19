import { Body, Controller, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { BaseController } from 'src/Classes/Base/Base.Controller';
import { RobotModel } from 'src/Model/Robot.Model';
import { JwtAuthGuard } from 'src/Auth/Guards/JwtAuth.Guard';
import { PayloadType } from 'src/Enums/PayloadType.enum';
import { RobotService } from './Robot.Service';
import { RobotCreateDto } from './DTO/robot.create.dto';
import { RobotUpdateDto } from './DTO/robot.update.dto';
import { RobotSchema } from './Schema/Robot.Schema';
import { MoveRawDto } from './DTO/move.raw.dto';
import { RgbLedDto } from './DTO/rgb.led.dto';
import { ControlModeDto } from './DTO/control.mode.dto';
import { WaypointsDto } from './DTO/waypoints.dto';
import { XgoActionDto } from './DTO/xgo.action.dto';
import { MoveRawSchema } from './Schema/MoveRaw.Schema';
import { RgbLedSchema } from './Schema/RgbLed.Schema';
import { ControlModeSchema } from './Schema/ControlMode.Schema';
import { WaypointsSchema } from './Schema/Waypoints.Schema';
import { XgoActionSchema } from './Schema/XgoAction.Schema';

/**
 * GET /, GET /:uuid, DELETE /:uuid vêm do BaseController como estão.
 * create/update são sobrescritos só pra trocar `Partial<T>` (generico, sem
 * metadata em runtime) pelo DTO concreto - ver comentário no
 * BaseController sobre por que isso é necessário pro ValidationPipe validar.
 * @UseGuards(JwtAuthGuard) no nível da classe protege as rotas herdadas do
 * BaseController também. Com AUTH_ACTIVATED=false (.env) o guard libera
 * geral - ver src/config/auth.config.ts.
 * Rotas de comando do protocolo (move-raw, rgb-led, control-mode, waypoints,
 * xgo-action) são endereçadas por `address` (chave física do rádio), não pelo
 * uuid, e delegam pro RobotService.sendCommand - ver AGENTS.md.
 */
@Controller('robots')
@ApiTags('Robots')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class RobotController extends BaseController<RobotModel> {

    constructor(private readonly robotService: RobotService) {
        super(robotService);
    }

    @Post()
    @ApiBody(RobotSchema)
    async create(@Body() dto: RobotCreateDto): Promise<RobotModel> {
        return super.create(dto);
    }

    @Put(':uuid')
    @ApiBody(RobotSchema)
    async update(@Param('uuid') uuid: string, @Body() dto: RobotUpdateDto): Promise<RobotModel> {
        return super.update(uuid, dto);
    }

    /** Comando de movimento (joystick) para um robô específico. */
    @Put(':address/move-raw')
    @ApiBody(MoveRawSchema)
    async moveRaw(@Param('address') address: string, @Body() dto: MoveRawDto) {
        return this.robotService.sendCommand(address, PayloadType.CMD_MOVE_RAW, 'move-raw', dto);
    }

    /** Comando de cor do LED RGB para um robô específico. */
    @Put(':address/rgb-led')
    @ApiBody(RgbLedSchema)
    async rgbLed(@Param('address') address: string, @Body() dto: RgbLedDto) {
        return this.robotService.sendCommand(address, PayloadType.CMD_RGB_LED, 'rgb-led', dto);
    }

    /** Alterna o modo de controle do robô (Manual/Auto). */
    @Put(':address/control-mode')
    @ApiBody(ControlModeSchema)
    async controlMode(@Param('address') address: string, @Body() dto: ControlModeDto) {
        return this.robotService.sendCommand(address, PayloadType.CONTROL_MODE, 'control-mode', dto);
    }

    /** Envia uma lista de waypoints (LH2) para o robô seguir. */
    @Put(':address/waypoints')
    @ApiBody(WaypointsSchema)
    async waypoints(@Param('address') address: string, @Body() dto: WaypointsDto) {
        return this.robotService.sendCommand(address, PayloadType.LH2_WAYPOINTS, 'waypoints', dto);
    }

    /** Envia uma ação para um robô XGO. */
    @Put(':address/xgo-action')
    @ApiBody(XgoActionSchema)
    async xgoAction(@Param('address') address: string, @Body() dto: XgoActionDto) {
        return this.robotService.sendCommand(address, PayloadType.CMD_XGO_ACTION, 'xgo-action', dto);
    }
}
