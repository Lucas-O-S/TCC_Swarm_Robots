import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { BaseService } from 'src/Classes/Base/Base.Service';
import { RobotModel } from 'src/Model/Robot.Model';
import { RobotRepository } from './Robot.Repository';
import { GATEWAY_ADAPTER } from 'src/adapter/GatewayAdapter.interface';
import type { GatewayAdapter } from 'src/adapter/GatewayAdapter.interface';
import { PayloadType } from 'src/Enums/PayloadType.enum';
import { PayloadSelector } from 'src/Protocols/PayloadSelector';
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

    /**
     * Escolhe o codec pelo tipo (via PayloadSelector), codifica o payload e
     * envia pro robô. Um ponto único cuida do "não achei codec" e do envio.
     */
    private dispatch(address: string, payloadType: PayloadType, payload: any): void {
        const codec = PayloadSelector.getPayloadCodec(payloadType);
        
        if (!codec) 
            throw new Error(`Nenhum codec registrado para o payload type ${payloadType}`);
        
        const body = codec.encodePayload(payload);
        this.gateway.send(address, payloadType, body);
    }

    async moveRaw(address: string, dto: MoveRawDto) {
        await this.requireByAddress(address);
        this.dispatch(address, PayloadType.CMD_MOVE_RAW, dto);
        return { address, command: 'move-raw', payload: dto };
    }

    async setRgbLed(address: string, dto: RgbLedDto) {
        await this.requireByAddress(address);
        this.dispatch(address, PayloadType.CMD_RGB_LED, dto);
        return { address, command: 'rgb-led', payload: dto };
    }

    async setControlMode(address: string, dto: ControlModeDto) {
        await this.requireByAddress(address);
        this.dispatch(address, PayloadType.CONTROL_MODE, dto);
        return { address, command: 'control-mode', payload: dto };
    }

    async setWaypoints(address: string, dto: WaypointsDto) {
        await this.requireByAddress(address);
        this.dispatch(address, PayloadType.LH2_WAYPOINTS, dto);
        return { address, command: 'waypoints', payload: dto };
    }

    async setXgoAction(address: string, dto: XgoActionDto) {
        await this.requireByAddress(address);
        this.dispatch(address, PayloadType.CMD_XGO_ACTION, dto);
        return { address, command: 'xgo-action', payload: dto };
    }
}
