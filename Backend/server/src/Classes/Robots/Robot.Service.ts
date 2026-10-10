import { Injectable, NotFoundException } from '@nestjs/common';
import { BaseService } from 'src/Classes/Base/Base.Service';
import { RobotModel } from 'src/Model/Robot.Model';
import { RobotRepository } from './Robot.Repository';
import { Command } from 'src/Enums/Command.enum';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RobotControlMode } from 'src/Enums/RobotControlMode.enum';
import { EventsCommands } from 'src/Enums/Events.Enum';
import { EdgeClient } from 'src/Classes/Edge/Edge.Client';

/**
 * CRUD básico (create/getOne/getAll/update/remove) vem do BaseService; aqui
 * só o que é específico do Robot - inclusive os comandos, que vão pro robô
 * pela borda (EdgeClient), endereçados por `address`, não pelo uuid. A API não
 * codifica mais nada: quem conhece o protocolo é a borda.
 */
@Injectable()
export class RobotService extends BaseService<RobotModel> {

    constructor(
        private readonly robotRepository: RobotRepository,
        private readonly edge: EdgeClient,
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
     * Ponto único por onde todo comando sai da API: entrega à borda, que
     * codifica e manda pelo rádio. Erro da borda (fora do ar, payload
     * recusado) sobe como HttpException.
     */
    private async dispatch(address: string, command: Command, payload: any): Promise<void> {
        await this.edge.sendCommand(address, command, payload);
    }

    /**
     * Fluxo comum de todo comando: confere se o robô existe, envia (via
     * dispatch) e devolve um recibo. As rotas do Controller só informam o
     * comando.
     */
    async sendCommand(address: string, command: Command, payload: any) {
        const robot = await this.requireByAddress(address);
        await this.dispatch(robot.address, command, payload);
        return { address: robot.address, command, payload };
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
        await this.dispatch(robot.address, Command.ControlMode, { mode: wireMode });
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
