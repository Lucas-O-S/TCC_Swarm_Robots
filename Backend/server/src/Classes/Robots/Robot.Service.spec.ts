import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { RobotService } from './Robot.Service';
import { RobotRepository } from './Robot.Repository';
import { EdgeClient } from 'src/Classes/Edge/Edge.Client';
import { Command } from 'src/Enums/Command.enum';
import { EventsCommands } from 'src/Enums/Events.Enum';
import { RobotControlMode } from 'src/Enums/RobotControlMode.enum';

const { Manual, Auto, SemiAuto } = RobotControlMode;

/**
 * Teste unitário (caixa-branca) do RobotService. O repositório, a borda
 * (EdgeClient) e o EventEmitter são mocks: os casos conferem o que o service
 * decide e o que ele manda para cada um.
 */
describe('RobotService', () => {
    let service: RobotService;

    const robo = { uuid: 'robo-1', address: 'AA01', mode: Auto, taskId: null };

    const repository = {
        getByAddress: jest.fn(),
        getFreeRobots: jest.fn(),
        findOrCreateByAddress: jest.fn(),
        exists: jest.fn(),
        update: jest.fn(),
        get: jest.fn(),
    };
    const edge = { sendCommand: jest.fn() };
    const events = { emit: jest.fn() };

    beforeEach(async () => {
        jest.clearAllMocks();
        repository.getByAddress.mockResolvedValue(robo);
        repository.exists.mockResolvedValue(true);
        repository.get.mockResolvedValue(robo);
        edge.sendCommand.mockResolvedValue({});

        const moduleRef = await Test.createTestingModule({
            providers: [
                RobotService,
                { provide: RobotRepository, useValue: repository },
                { provide: EdgeClient, useValue: edge },
                { provide: EventEmitter2, useValue: events },
            ],
        }).compile();

        service = moduleRef.get(RobotService);
    });

    describe('sendCommand', () => {
        it('robô cadastrado → manda o comando para a borda e devolve o recibo', async () => {
            const recibo = await service.sendCommand('AA01', Command.RgbLed, { red: 1, green: 2, blue: 3 });

            expect(edge.sendCommand).toHaveBeenCalledWith('AA01', Command.RgbLed, { red: 1, green: 2, blue: 3 });
            expect(recibo).toEqual({ address: 'AA01', command: Command.RgbLed, payload: { red: 1, green: 2, blue: 3 } });
        });

        it('robô não cadastrado → 404 e nada vai para a borda', async () => {
            repository.getByAddress.mockResolvedValue(null);

            await expect(service.sendCommand('FFFF', Command.RgbLed, {})).rejects.toBeInstanceOf(NotFoundException);
            expect(edge.sendCommand).not.toHaveBeenCalled();
        });
    });

    describe('setControlMode (tabela de decisão do RF05)', () => {
        it.each([
            { modo: Manual, nome: 'Manual', enviado: Manual },
            { modo: Auto, nome: 'Auto', enviado: Auto },
            { modo: SemiAuto, nome: 'SemiAuto', enviado: Auto },
        ])('$nome → envia CONTROL_MODE $enviado, grava o modo e avisa a troca', async ({ modo, enviado }) => {
            await service.setControlMode('AA01', modo);

            expect(edge.sendCommand).toHaveBeenCalledWith('AA01', Command.ControlMode, { mode: enviado });
            expect(repository.update).toHaveBeenCalledWith({ mode: modo }, 'robo-1');
            expect(events.emit).toHaveBeenCalledWith(EventsCommands.modeChanged, { address: 'AA01', mode: modo });
        });

        it('robô não cadastrado → 404 sem enviar nem gravar', async () => {
            repository.getByAddress.mockResolvedValue(null);

            await expect(service.setControlMode('FFFF', Manual)).rejects.toBeInstanceOf(NotFoundException);
            expect(edge.sendCommand).not.toHaveBeenCalled();
            expect(repository.update).not.toHaveBeenCalled();
        });

        it('borda fora → erro, o modo não é gravado e a troca não é avisada', async () => {
            edge.sendCommand.mockRejectedValue(new ServiceUnavailableException('Nenhuma borda conectada'));

            await expect(service.setControlMode('AA01', Manual)).rejects.toBeInstanceOf(ServiceUnavailableException);
            expect(repository.update).not.toHaveBeenCalled();
            expect(events.emit).not.toHaveBeenCalled();
        });
    });

    describe('stop', () => {
        it.each([
            { modo: Manual, enviado: Manual },
            { modo: SemiAuto, enviado: Auto },
        ])('robô em $modo → para com CONTROL_MODE $enviado, sem trocar o modo', async ({ modo, enviado }) => {
            await service.stop({ ...robo, mode: modo } as never);

            expect(edge.sendCommand).toHaveBeenCalledWith('AA01', Command.ControlMode, { mode: enviado });
            expect(repository.update).not.toHaveBeenCalled();
        });
    });

    describe('consultas', () => {
        it('repassa as consultas para o repositório', async () => {
            repository.getFreeRobots.mockResolvedValue([robo]);
            repository.findOrCreateByAddress.mockResolvedValue([robo, false]);

            expect(await service.getByAddress('AA01')).toBe(robo);
            expect(await service.getFreeRobots()).toEqual([robo]);
            expect(await service.findOrCreateByAddress('AA01', { name: 'x' } as never)).toEqual([robo, false]);
            expect(repository.findOrCreateByAddress).toHaveBeenCalledWith('AA01', { name: 'x' });
        });
    });
});
