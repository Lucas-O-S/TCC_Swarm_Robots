import { createBaseRepository } from './BaseRepository';
import { Callout } from '../Integration/Callout';
import type { CalloutResult } from '../Integration/Callout';
import { robotDtoSchema } from '../dto/robot.dto';
import type { RobotDto } from '../dto/robot.dto';
import type { RobotCreateRequest } from '../dto/robot.create.dto';
import type { RobotUpdateRequest } from '../dto/robot.update.dto';
import { robotCommandReceiptSchema } from '../dto/robot.command.dto';
import type {
    RobotCommandReceiptDto,
    RobotControlModeRequest,
    RobotMoveRawRequest,
    RobotRgbLedRequest,
    RobotWaypointsRequest,
    RobotXgoActionRequest,
} from '../dto/robot.command.dto';
import { RobotCommand } from '../enums/RobotCommand.enum';

/**
 * Rotas de `RobotController` (`/robots`):
 *
 *  - CRUD por **uuid** (herdado do `BaseController`);
 *  - comandos por **address** (a chave física do rádio, não o uuid):
 *    `PUT /robots/:address/<move-raw | rgb-led | control-mode | waypoints | xgo-action>`.
 *
 * Devolve o `CalloutResult` cru, ainda em DTO.
 */
const crud = createBaseRepository<RobotDto, RobotCreateRequest, RobotUpdateRequest>('/robots', robotDtoSchema);

/** Monta `/robots/<address>/<comando>` — o address vai codificado pra não quebrar a rota. */
const commandUrl = (address: string, command: RobotCommand) =>
    `/robots/${encodeURIComponent(address)}/${command}`;

export const RobotRepository = {
    ...crud,

    moveRaw(address: string, body: RobotMoveRawRequest): Promise<CalloutResult<RobotCommandReceiptDto>> {
        return Callout.put(commandUrl(address, RobotCommand.MoveRaw), body, robotCommandReceiptSchema);
    },

    setRgbLed(address: string, body: RobotRgbLedRequest): Promise<CalloutResult<RobotCommandReceiptDto>> {
        return Callout.put(commandUrl(address, RobotCommand.RgbLed), body, robotCommandReceiptSchema);
    },

    setControlMode(address: string, body: RobotControlModeRequest): Promise<CalloutResult<RobotCommandReceiptDto>> {
        return Callout.put(commandUrl(address, RobotCommand.ControlMode), body, robotCommandReceiptSchema);
    },

    sendWaypoints(address: string, body: RobotWaypointsRequest): Promise<CalloutResult<RobotCommandReceiptDto>> {
        return Callout.put(commandUrl(address, RobotCommand.Waypoints), body, robotCommandReceiptSchema);
    },

    sendXgoAction(address: string, body: RobotXgoActionRequest): Promise<CalloutResult<RobotCommandReceiptDto>> {
        return Callout.put(commandUrl(address, RobotCommand.XgoAction), body, robotCommandReceiptSchema);
    },
};