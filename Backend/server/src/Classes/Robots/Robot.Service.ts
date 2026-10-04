import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { BaseService } from 'src/Classes/Base/Base.Service';
import { RobotModel } from 'src/Model/Robot.Model';
import { RobotRepository } from './Robot.Repository';
import { GATEWAY_ADAPTER } from 'src/adapter/GatewayAdapter.interface';
import type { GatewayAdapter } from 'src/adapter/GatewayAdapter.interface';
import { PayloadType } from 'src/Enums/PayloadType.enum';
import { Command } from 'src/Enums/Command.enum';
import { PayloadSelector } from 'src/Protocols/PayloadSelector';
import { PayloadCoder } from 'src/Protocols/Wrappers/PayloadProtocol';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RobotControlMode } from 'src/Enums/RobotControlMode.enum';
import { EventsCommands } from 'src/Enums/Events.Enum';

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
        private readonly events: EventEmitter2,
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
        const codec: PayloadCoder<any> | null = PayloadSelector.getPayloadCoder(payloadType);
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
        command: Command,
        payload: any
    ) {
        await this.requireByAddress(address);
        this.dispatch(address, payloadType, payload);
        return { address, command, payload };
    }

    /**
     * O modo é regra do backend (quem pode comandar o robô), então a fonte da
     * verdade é robots.mode. No firmware DotBot 1.22.0 o CONTROL_MODE só para
     * os motores e aborta os waypoints (o valor é ignorado), e o `mode` do
     * advertisement vai zerado - não dá pra ler o modo de volta do robô.
     * Como o robô para, a task em andamento é solta via evento (Orchestrator).
     */
    async setControlMode(address: string, mode: RobotControlMode) {
        const robot = await this.requireByAddress(address);
        // SemiAuto não existe no robô: pra ele é Auto (segue waypoints).
        const wireMode = mode === RobotControlMode.Manual ? RobotControlMode.Manual : RobotControlMode.Auto;
        this.dispatch(robot.address, PayloadType.CONTROL_MODE, { mode: wireMode });
        await this.update(robot.uuid, { mode });
        this.events.emit(EventsCommands.modeChanged, { address: robot.address, mode });
        return { address: robot.address, command: Command.ControlMode, payload: { mode } };
    }

    async getFreeRobots(): Promise<RobotModel[] | null> {
        return await this.robotRepository.getFreeRobots();
    }


    async findOrCreateByAddress(address: string, defaults : Partial<RobotModel> = {}): Promise<[RobotModel, boolean]> {

        return await this.robotRepository.findOrCreateByAddress(address, defaults);;
    }
}
