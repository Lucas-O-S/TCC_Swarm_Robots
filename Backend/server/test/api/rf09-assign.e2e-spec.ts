import { createTestApp, resetState, TestContext } from '../helpers/app';
import { getToken, put } from '../helpers/api';
import { createRobot, createTask, getRobot, getTask, ROBO } from '../helpers/db';
import { Command } from 'src/Enums/Command.enum';
import { RobotControlMode } from 'src/Enums/RobotControlMode.enum';
import { TaskStatus } from 'src/Enums/TaskStatus.Enum';
import { TaskModel } from 'src/Model/Task.Model';

/**
 * RF09 – Atribuição de task (PUT /orchestrator/robots/{address}/assign).
 * Casos CT-09-01 a CT-09-12 do Quadro 20, um por regra da tabela de decisão
 * (Quadro 9). A pré-condição padrão é robô em Auto, livre, com bateria boa e
 * calibrado; cada linha muda só o que a regra pede.
 */
interface Regra {
    id: string;
    regra: string;
    /** Prepara o cenário e devolve o taskId que vai na requisição. */
    preparar: (ctx: TestContext) => Promise<string>;
    status: number;
    /** Trecho da mensagem de erro que identifica a regra. */
    erro?: RegExp;
}

const UUID_INEXISTENTE = '00000000-0000-4000-8000-000000000000';
const pendente = async () => (await createTask(5)).uuid;

const regras: Regra[] = [
    { id: 'CT-09-01', regra: 'R1', status: 400, erro: /taskId must be a UUID/, preparar: async () => { await createRobot(); return 'abc'; } },
    { id: 'CT-09-02', regra: 'R2', status: 404, erro: /Nenhum robô com o endereço/, preparar: async () => pendente() },
    { id: 'CT-09-03', regra: 'R3', status: 400, erro: /modo Manual/, preparar: async () => { await createRobot({ mode: RobotControlMode.Manual }); return pendente(); } },
    {
        id: 'CT-09-04', regra: 'R4', status: 409, erro: /já está executando uma task/, preparar: async () => {
            const outra = await createTask(3, TaskStatus.InProgress);
            await createRobot({ taskId: outra.uuid });
            return pendente();
        },
    },
    { id: 'CT-09-05', regra: 'R5', status: 409, erro: /bateria baixa/, preparar: async (ctx) => { ctx.batteryVolts.mockReturnValue(2.9); await createRobot(); return pendente(); } },
    { id: 'CT-09-06', regra: 'R6', status: 409, erro: /não pode receber task/, preparar: async (ctx) => { ctx.taskBlockReason.mockReturnValue('sem posição válida'); await createRobot(); return pendente(); } },
    { id: 'CT-09-07', regra: 'R7', status: 404, erro: /Nenhuma task com uuid/, preparar: async () => { await createRobot(); return UUID_INEXISTENTE; } },
    { id: 'CT-09-08', regra: 'R8', status: 400, erro: /não tem waypoints/, preparar: async () => { await createRobot(); return (await createTask(0)).uuid; } },
    { id: 'CT-09-09', regra: 'R8', status: 400, erro: /no máximo 16/, preparar: async () => { await createRobot(); return (await createTask(17)).uuid; } },
    { id: 'CT-09-10', regra: 'R9', status: 409, erro: /já está em andamento/, preparar: async () => { await createRobot(); return (await createTask(5, TaskStatus.InProgress)).uuid; } },
    { id: 'CT-09-11', regra: 'R10', status: 500, erro: /Falha ao enviar waypoints/, preparar: async (ctx) => { ctx.sendCommand.mockRejectedValue(new Error('borda fora do ar')); await createRobot(); return pendente(); } },
    { id: 'CT-09-12', regra: 'R11', status: 200, preparar: async () => { await createRobot(); return pendente(); } },
];

describe('RF09 – Atribuição de task', () => {
    let ctx: TestContext;
    let token: string;

    beforeAll(async () => { ctx = await createTestApp(); });
    afterAll(async () => { await ctx.app.close(); });
    beforeEach(async () => {
        await resetState(ctx);
        token = await getToken(ctx);
    });

    it.each(regras)('$id ($regra) → $status', async (r) => {
        const taskId = await r.preparar(ctx);
        const antes = r.status === 200 || r.regra === 'R10' ? await getTask(taskId) : null;

        const res = await put(ctx, token, `/orchestrator/robots/${ROBO}/assign`, { taskId });

        expect(res.status).toBe(r.status);

        if (r.erro) {
            expect(res.body.error).toMatch(r.erro);
        }

        if (r.regra === 'R11') {
            expect((await getTask(taskId))?.status).toBe(TaskStatus.InProgress);
            expect((await getRobot())?.taskId).toBe(taskId);
            expect(ctx.sendCommand).toHaveBeenCalledWith(ROBO, Command.Waypoints, {
                threshold: expect.any(Number),
                waypoints: pontosEmOrdem(5),
            });
        }

        if (r.regra === 'R10') {
            expect((await getTask(taskId))?.status).toBe((antes as TaskModel).status);
            expect((await getRobot())?.taskId).toBeNull();
        }
    });
});

/** Pontos da task na ordem de orderIndex (ver createTask). */
function pontosEmOrdem(n: number) {
    return Array.from({ length: n }, (_, i) => ({ x: 100 * (i + 1), y: 50 * (i + 1) }));
}
