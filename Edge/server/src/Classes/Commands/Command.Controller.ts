import { Body, Controller, HttpCode, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiTags } from "@nestjs/swagger";
import { EdgeTokenGuard } from "src/Classes/Auth/EdgeToken.Guard";
import { Command } from "src/Enums/Command.enum";
import { CommandService } from "./Command.Service";
import { MoveRawDto } from "./DTO/move.raw.dto";
import { RgbLedDto } from "./DTO/rgb.led.dto";
import { ControlModeDto } from "./DTO/control.mode.dto";
import { WaypointsDto } from "./DTO/waypoints.dto";
import { XgoActionDto } from "./DTO/xgo.action.dto";
import { MoveRawSchema } from "./Schema/MoveRaw.Schema";
import { RgbLedSchema } from "./Schema/RgbLed.Schema";
import { ControlModeSchema } from "./Schema/ControlMode.Schema";
import { WaypointsSchema } from "./Schema/Waypoints.Schema";
import { XgoActionSchema } from "./Schema/XgoAction.Schema";

/**
 * Comandos para um robô, endereçados por `address` (chave física do rádio).
 * Respondem 202: o rádio é fire-and-forget, "aceito" quer dizer que o pacote
 * foi entregue ao gateway, não que o robô executou.
 */
@Controller('robots/:address/commands')
@ApiTags('Commands')
@ApiBearerAuth()
@UseGuards(EdgeTokenGuard)
export class CommandController {

    constructor(private readonly commands: CommandService) {}

    /** Movimento cru (joystick): left_y = roda esquerda, right_y = roda direita. */
    @Post(Command.MoveRaw)
    @HttpCode(202)
    @ApiBody(MoveRawSchema)
    moveRaw(@Param('address') address: string, @Body() dto: MoveRawDto) {
        return this.commands.send(address, Command.MoveRaw, dto);
    }

    /** Cor do LED RGB. */
    @Post(Command.RgbLed)
    @HttpCode(202)
    @ApiBody(RgbLedSchema)
    rgbLed(@Param('address') address: string, @Body() dto: RgbLedDto) {
        return this.commands.send(address, Command.RgbLed, dto);
    }

    /** Modo de controle do robô (0 Manual / 1 Auto). Para os motores e aborta waypoints. */
    @Post(Command.ControlMode)
    @HttpCode(202)
    @ApiBody(ControlModeSchema)
    controlMode(@Param('address') address: string, @Body() dto: ControlModeDto) {
        return this.commands.send(address, Command.ControlMode, dto);
    }

    /** Lista de waypoints (LH2, mm) para o robô seguir. */
    @Post(Command.Waypoints)
    @HttpCode(202)
    @ApiBody(WaypointsSchema)
    waypoints(@Param('address') address: string, @Body() dto: WaypointsDto) {
        return this.commands.send(address, Command.Waypoints, dto);
    }

    /** Ação de um robô XGO. */
    @Post(Command.XgoAction)
    @HttpCode(202)
    @ApiBody(XgoActionSchema)
    xgoAction(@Param('address') address: string, @Body() dto: XgoActionDto) {
        return this.commands.send(address, Command.XgoAction, dto);
    }
}
