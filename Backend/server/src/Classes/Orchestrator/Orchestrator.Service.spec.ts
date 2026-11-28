import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { OrchestratorService } from './Orchestrator.Service';
import { TaskService } from 'src/Classes/Tasks/Task.Service';
import { RobotService } from 'src/Classes/Robots/Robot.Service';
import { SwarmService } from 'src/Classes/Swarm/Swarm.Service';
import { Command } from 'src/Enums/Command.enum';
import { RobotControlMode } from 'src/Enums/RobotControlMode.enum';
import { RobotStatus } from 'src/Enums/RobotStatus.enum';
import { TaskStatus } from 'src/Enums/TaskStatus.Enum';

/**
 * Teste unitário (caixa-branca) do OrchestratorService. Os services de que ele
 * depende (TaskService, RobotService e SwarmService) são mocks, então só a
 * lógica de decisão do orquestrador é exercitada: cada caso passa por um lado
 * de um if.
 */
describe('OrchestratorService', () => {
    let service: OrchestratorService;

    const taskService = {
        getPendingTask: jest.fn(),
        getOneTaskWithWaypoints: jest.fn(),
        update: jest.fn(),
    };
    const robotService = {
        getByAddress: jest.fn(),
        getFreeRobots: jest.fn(),
        sendCommand: jest.fn(),
        update: jest.fn(),
        stop: jest.fn(),
    };
    const swarmService = {
        batteryVolts: jest.fn(),
        taskBlockReason: jest.fn(),
    };

    const robo = (dados: object = {}) => ({
        uuid: 'robo-1', address: 'AA01', name: 'Robô 1', mode: RobotControlMode.Auto,
        taskId: null, waypointsThreshold: 100, ...dados,
    });
    const task = (pontos: number, dados: object = {}) => ({
        uuid: 'task-1', name: 'Task 1', status: TaskStatus.Pending,
        waypoints: Array.from({ length: pontos }, (_, i) => ({ orderIndex: pontos - 1 - i, x: i, y: i })),
        ...dados,
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        swarmService.batteryVolts.mockReturnValue(2.5);
        swarmService.taskBlockReason.mockReturnValue(null);
        robotService.sendCommand.mockResolvedValue({});

        const moduleRef = await Test.createTestingModule({
            providers: [
                OrchestratorService,
                { provide: TaskService, useValue: taskService },
                { provide: RobotService, useValue: robotService },
                { provide: SwarmService, useValue: swarmService },
            ],
        }).compile();

        service = moduleRef.get(OrchestratorService);
        jest.spyOn(console, 'log').mockImplementation(() => undefined);
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    describe('assignTaskManually (tabela de decisão do RF09)', () => {
        it.each([
            { regra: 'R2 robô não existe', robo: null, task: task(5), erro: NotFoundException },
            { regra: 'R3 robô em Manual', robo: robo({ mode: RobotControlMode.Manual }), task: task(5), erro: BadRequestException },
            { regra: 'R4 robô ocupado', robo: robo({ taskId: 'outra' }), task: task(5), erro: ConflictException },
            { regra: 'R5 bateria baixa', robo: robo(), task: task(5), bateria: 0.9, erro: ConflictException },
            { regra: 'R6 sem calibração', robo: robo(), task: task(5), bloqueio: 'sem posição', erro: ConflictException },
            { regra: 'R7 task não existe', robo: robo(), task: null, erro: NotFoundException },
            { regra: 'R8 task sem pontos', robo: robo(), task: task(0), erro: BadRequestException },
            { regra: 'R8 task com 17 pontos', robo: robo(), task: task(17), erro: BadRequestException },
            { regra: 'R9 task em andamento', robo: robo(), task: task(5, { status: TaskStatus.InProgress }), erro: ConflictException },
        ])('$regra → $erro.name', async (c) => {
            robotService.getByAddress.mockResolvedValue(c.robo);
            taskService.getOneTaskWithWaypoints.mockResolvedValue(c.task);
            if (c.bateria !== undefined) swarmService.batteryVolts.mockReturnValue(c.bateria);
            if (c.bloqueio) swarmService.taskBlockReason.mockReturnValue(c.bloqueio);

            await expect(service.assignTaskManually('AA01', 'task-1')).rejects.toBeInstanceOf(c.erro);

            expect(robotService.sendCommand).not.toHaveBeenCalled();
            expect(taskService.update).not.toHaveBeenCalled();
        });

        it('R5 sem leitura de bateria (null) não bloqueia', async () => {
            robotService.getByAddress.mockResolvedValue(robo());
            taskService.getOneTaskWithWaypoints.mockResolvedValue(task(2));
            swarmService.batteryVolts.mockReturnValue(null);

            await service.assignTaskManually('AA01', 'task-1');

            expect(robotService.sendCommand).toHaveBeenCalled();
        });

        it('R10 falha no envio → erro e nada é gravado', async () => {
            robotService.getByAddress.mockResolvedValue(robo());
            taskService.getOneTaskWithWaypoints.mockResolvedValue(task(5));
            robotService.sendCommand.mockRejectedValue(new Error('borda fora'));

            await expect(service.assignTaskManually('AA01', 'task-1')).rejects.toThrow('Falha ao enviar waypoints');

            expect(taskService.update).not.toHaveBeenCalled();
            expect(robotService.update).not.toHaveBeenCalled();
        });

        it('R11 tudo certo → envia os pontos em ordem e grava task e robô', async () => {
            robotService.getByAddress.mockResolvedValue(robo());
            taskService.getOneTaskWithWaypoints.mockResolvedValue(task(3));

            await service.assignTaskManually('AA01', 'task-1');

            expect(robotService.sendCommand).toHaveBeenCalledWith('AA01', Command.Waypoints, {
                threshold: 100,
                waypoints: [{ x: 2, y: 2 }, { x: 1, y: 1 }, { x: 0, y: 0 }],
            });
            expect(taskService.update).toHaveBeenCalledWith('task-1', { status: TaskStatus.InProgress });
            expect(robotService.update).toHaveBeenCalledWith('robo-1', { taskId: 'task-1' });
        });
    });

    describe('assignPending (atribuição automática)', () => {
        it('pula task rejeitada, para quando acabam os robôs e grava as atribuídas', async () => {
            taskService.getPendingTask.mockResolvedValue([
                task(0, { uuid: 'sem-pontos' }),
                task(2, { uuid: 'task-a' }),
                task(2, { uuid: 'task-b' }),
            ]);
            robotService.getFreeRobots.mockResolvedValue([robo({ uuid: 'robo-1' })]);

            await service.assignPending();

            expect(robotService.sendCommand).toHaveBeenCalledTimes(1);
            expect(taskService.update).toHaveBeenCalledWith('task-a', { status: TaskStatus.InProgress });
            expect(robotService.update).toHaveBeenCalledWith('robo-1', { taskId: 'task-a' });
        });

        it('falha no envio deixa a task na fila e tenta a próxima', async () => {
            taskService.getPendingTask.mockResolvedValue([task(2, { uuid: 'task-a' }), task(2, { uuid: 'task-b' })]);
            robotService.getFreeRobots.mockResolvedValue([robo({ uuid: 'robo-2' }), robo({ uuid: 'robo-1' })]);
            robotService.sendCommand.mockRejectedValueOnce(new Error('borda fora')).mockResolvedValue({});

            await service.assignPending();

            expect(taskService.update).toHaveBeenCalledTimes(1);
            expect(taskService.update).toHaveBeenCalledWith('task-b', { status: TaskStatus.InProgress });
        });

        it('sem tasks e sem robôs (respostas nulas) não grava nada', async () => {
            taskService.getPendingTask.mockResolvedValue(null);
            robotService.getFreeRobots.mockResolvedValue(null);

            await service.assignPending();

            expect(taskService.update).not.toHaveBeenCalled();
            expect(robotService.update).not.toHaveBeenCalled();
        });

        it('robô em Manual não entra na lista de livres', async () => {
            taskService.getPendingTask.mockResolvedValue([task(2)]);
            robotService.getFreeRobots.mockResolvedValue([robo({ mode: RobotControlMode.Manual })]);

            await service.assignPending();

            expect(robotService.sendCommand).not.toHaveBeenCalled();
        });
    });

    describe('onModeChanged (tabela de decisão do RF05, saída E7)', () => {
        it.each([
            { caso: 'robô não existe', robo: null, devolve: false },
            { caso: 'robô sem task', robo: robo(), devolve: false },
            { caso: 'robô com task', robo: robo({ taskId: 'task-1' }), devolve: true },
        ])('$caso → devolve a task: $devolve', async ({ robo: r, devolve }) => {
            robotService.getByAddress.mockResolvedValue(r);

            await service.onModeChanged({ address: 'AA01' });

            if (devolve) {
                expect(taskService.update).toHaveBeenCalledWith('task-1', { status: TaskStatus.Pending });
                expect(robotService.update).toHaveBeenCalledWith('robo-1', { taskId: null });
            } else {
                expect(taskService.update).not.toHaveBeenCalled();
            }
        });
    });

    describe('handleRobotLost', () => {
        it('robô sem task não faz nada', async () => {
            robotService.getByAddress.mockResolvedValue(robo());

            await service.handleRobotLost({ address: 'AA01' });

            expect(robotService.stop).not.toHaveBeenCalled();
        });

        it.each([
            { caso: 'parada enviada', pararFalha: false },
            { caso: 'borda fora na parada', pararFalha: true },
        ])('robô com task ($caso) → para, devolve a task e marca Lost', async ({ pararFalha }) => {
            robotService.getByAddress.mockResolvedValue(robo({ taskId: 'task-1' }));
            if (pararFalha) robotService.stop.mockRejectedValue(new Error('borda fora'));

            await service.handleRobotLost({ address: 'AA01' });

            expect(robotService.stop).toHaveBeenCalled();
            expect(taskService.update).toHaveBeenCalledWith('task-1', { status: TaskStatus.Pending });
            expect(robotService.update).toHaveBeenCalledWith('robo-1', { taskId: null, status: RobotStatus.Lost });
        });
    });

    describe('onAdvertisement (bateria e conclusão da task)', () => {
        const anuncio = (address: string, battery: number, waypoint_idx: number) => ({ address, data: { battery, waypoint_idx } });

        it('bateria baixa → para o robô e devolve a task', async () => {
            robotService.getByAddress.mockResolvedValue(robo({ taskId: 'task-1' }));

            await service.onAdvertisement(anuncio('B1', 2900, 0));

            expect(robotService.stop).toHaveBeenCalled();
            expect(taskService.update).toHaveBeenCalledWith('task-1', { status: TaskStatus.Pending });
        });

        it('passou do último ponto → conclui a task', async () => {
            robotService.getByAddress.mockResolvedValue(robo({ taskId: 'task-1' }));
            taskService.getOneTaskWithWaypoints.mockResolvedValue(task(3));

            await service.onAdvertisement(anuncio('B2', 3900, 3));

            expect(taskService.update).toHaveBeenCalledWith('task-1', { status: TaskStatus.Completed });
            expect(robotService.update).toHaveBeenCalledWith('robo-1', { taskId: null });
        });

        it('ainda no meio da rota → não muda nada', async () => {
            robotService.getByAddress.mockResolvedValue(robo({ taskId: 'task-1' }));
            taskService.getOneTaskWithWaypoints.mockResolvedValue(task(3));

            await service.onAdvertisement(anuncio('B3', 3900, 1));

            expect(taskService.update).not.toHaveBeenCalled();
        });

        it('task apagada (sem waypoints) → considera concluída', async () => {
            robotService.getByAddress.mockResolvedValue(robo({ taskId: 'task-1' }));
            taskService.getOneTaskWithWaypoints.mockResolvedValue(null);

            await service.onAdvertisement(anuncio('B4', 3900, 0));

            expect(taskService.update).toHaveBeenCalledWith('task-1', { status: TaskStatus.Completed });
        });

        it('robô sem task → não consulta a task', async () => {
            robotService.getByAddress.mockResolvedValue(robo());

            await service.onAdvertisement(anuncio('B5', 3900, 0));

            expect(taskService.getOneTaskWithWaypoints).not.toHaveBeenCalled();
        });

        it('mesmo anúncio repetido logo em seguida → só confere uma vez', async () => {
            robotService.getByAddress.mockResolvedValue(robo());

            await service.onAdvertisement(anuncio('B6', 3900, 0));
            await service.onAdvertisement(anuncio('B6', 3900, 0));

            expect(robotService.getByAddress).toHaveBeenCalledTimes(1);
        });

        it('anúncio do mesmo robô enquanto o anterior ainda é conferido → ignora', async () => {
            let liberar: (valor: unknown) => void = () => undefined;
            robotService.getByAddress.mockReturnValue(new Promise((resolve) => { liberar = resolve; }));

            const primeiro = service.onAdvertisement(anuncio('B7', 3900, 0));
            await service.onAdvertisement(anuncio('B7', 3900, 1));
            liberar(robo());
            await primeiro;

            expect(robotService.getByAddress).toHaveBeenCalledTimes(1);
        });
    });

    describe('atribuição automática ligada/desligada', () => {
        afterEach(() => jest.useRealTimers());

        it('o loop só atribui quando está ligado', async () => {
            jest.useFakeTimers();
            const assignPending = jest.spyOn(service, 'assignPending').mockResolvedValue();

            service.setAutoEnabled(false);
            service.onModuleInit();
            await jest.advanceTimersByTimeAsync(5000);
            expect(assignPending).not.toHaveBeenCalled();

            service.setAutoEnabled(true);
            await jest.advanceTimersByTimeAsync(5000);
            expect(assignPending).toHaveBeenCalledTimes(1);
            expect(service.isAutoEnabled()).toBe(true);
        });

        it('erro no loop é registrado e não derruba o serviço', async () => {
            jest.useFakeTimers();
            jest.spyOn(service, 'assignPending').mockRejectedValue(new Error('banco fora'));

            service.setAutoEnabled(true);
            service.onModuleInit();
            await jest.advanceTimersByTimeAsync(5000);

            expect(console.error).toHaveBeenCalled();
        });

        it('ligar quando já está ligado não muda nada', () => {
            service.setAutoEnabled(true);
            service.setAutoEnabled(true);

            expect(service.isAutoEnabled()).toBe(true);
        });
    });
});
