import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { BaseService } from 'src/Classes/Base/Base.Service';
import { RobotModel } from 'src/Model/Robot.Model';
import { RobotRepository } from './Robot.Repository';
import { GATEWAY_ADAPTER } from 'src/adapter/GatewayAdapter.interface';
import type { GatewayAdapter } from 'src/adapter/GatewayAdapter.interface';
import { PayloadType } from 'src/Enums/PayloadType.enum';
import { PayloadSelector } from 'src/Protocols/PayloadSelector';
import { PayloadProtocol } from 'src/Protocols/Wrappers/PayloadProtocol';

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
        const codec: PayloadProtocol<any> | null = PayloadSelector.getPayloadCodec(payloadType);
        if (!codec) {
            throw new Error(`Nenhum codec registrado para o payload type ${payloadType}`);
        }
        const body = codec.encodePayload(payload);
        this.gateway.send(address, payloadType, body);
    }

    /**
     * Fluxo comum de todo comando: confere se o robô existe, codifica+envia
     * (via dispatch) e devolve um recibo. As rotas do Controller só informam o
     * tipo do payload e o rótulo do comando.
     */
    async sendCommand(
        address: string,
        payloadType: PayloadType,
        command: string,
        payload: any
    ) {
        await this.requireByAddress(address);
        this.dispatch(address, payloadType, payload);
        return { address, command, payload };
    }
}
