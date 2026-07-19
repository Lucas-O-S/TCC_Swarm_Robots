import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { BaseService } from 'src/Classes/Base/Base.Service';
import { RobotModel } from 'src/Model/Robot.Model';
import { RobotRepository } from './Robot.Repository';
import { GATEWAY_ADAPTER } from 'src/adapter/GatewayAdapter.interface';
import type { GatewayAdapter } from 'src/adapter/GatewayAdapter.interface';
import { PayloadType } from 'src/Enums/PayloadType.enum';
import { MovePayloadProtocol } from 'src/Protocols/Wrappers/MovePayload.wrapper';
import { RgbLedPayloadProtocol } from 'src/Protocols/Wrappers/RgbLedPayload.wrapper';
import { ControlModePayloadProtocol } from 'src/Protocols/Wrappers/ControlModePayload.wrapper';
import { Lh2WaypointsPayloadProtocol } from 'src/Protocols/Wrappers/Lh2WaypointsPayload.wrapper';
import { XgoActionPayloadProtocol } from 'src/Protocols/Wrappers/XgoActionPayload.wrapper';
import { MoveRawDto } from './DTO/move.raw.dto';
import { RgbLedDto } from './DTO/rgb.led.dto';
import { ControlModeDto } from './DTO/control.mode.dto';
import { WaypointsDto } from './DTO/waypoints.dto';
import { XgoActionDto } from './DTO/xgo.action.dto';

/**
 * CRUD básico (create/getOne/getAll/update/remove) vem do BaseService; aqui
 * só o que é específico do Robot - inclusive os comandos de protocolo, que
 * codificam o payload e mandam pro robô via GatewayAdapter (endereçado por
 * `address`, não pelo uuid).
 */
@Injectable()
export class RobotService extends BaseService<RobotModel> {

    constructor(
        private readonly robotRepository: RobotRepository,
        @Inject(GATEWAY_ADAPTER) private readonly gateway: GatewayAdapter,
    ) {
        super(robotRepository);
    }

    async getByAddress(address: string): Promise<RobotModel | null> {
        return await this.robotRepository.getByAddress(address);
    }

    /** Garante que o robô existe antes de mandar comando; senão 404. */
    private async requireByAddress(address: string): Promise<RobotModel> {
        const robot = await this.robotRepository.getByAddress(address);
        if (!robot) {
            throw new NotFoundException(`Nenhum robô com o endereço '${address}'`);
        }
        return robot;
    }

    async moveRaw(address: string, dto: MoveRawDto) {
        await this.requireByAddress(address);
        const body = new MovePayloadProtocol().encodePayload(dto);
        this.gateway.send(address, PayloadType.CMD_MOVE_RAW, body);
        return { address, command: 'move-raw', payload: dto };
    }

    async setRgbLed(address: string, dto: RgbLedDto) {
        await this.requireByAddress(address);
        const body = new RgbLedPayloadProtocol().encodePayload(dto);
        this.gateway.send(address, PayloadType.CMD_RGB_LED, body);
        return { address, command: 'rgb-led', payload: dto };
    }

    async setControlMode(address: string, dto: ControlModeDto) {
        await this.requireByAddress(address);
        const body = new ControlModePayloadProtocol().encodePayload(dto);
        this.gateway.send(address, PayloadType.CONTROL_MODE, body);
        return { address, command: 'control-mode', payload: dto };
    }

    async setWaypoints(address: string, dto: WaypointsDto) {
        await this.requireByAddress(address);
        const body = new Lh2WaypointsPayloadProtocol().encodePayload(dto);
        this.gateway.send(address, PayloadType.LH2_WAYPOINTS, body);
        return { address, command: 'waypoints', payload: dto };
    }

    async setXgoAction(address: string, dto: XgoActionDto) {
        await this.requireByAddress(address);
        const body = new XgoActionPayloadProtocol().encodePayload(dto);
        this.gateway.send(address, PayloadType.CMD_XGO_ACTION, body);
        return { address, command: 'xgo-action', payload: dto };
    }
}
