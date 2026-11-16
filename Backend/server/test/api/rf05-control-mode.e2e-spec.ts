import { ServiceUnavailableException } from '@nestjs/common';
import { createTestApp, resetState, TestContext } from '../helpers/app';
import { getToken, put, waitFor } from '../helpers/api';
import { createRobot, createTask, getRobot, getTask, ROBO } from '../helpers/db';
import { Command } from 'src/Enums/Command.enum';
import { RobotControlMode } from 'src/Enums/RobotControlMode.enum';
import { TaskStatus } from 'src/Enums/TaskStatus.Enum';

const { Manual, Auto, SemiAuto } = RobotControlMode;

/**
 * RF05 – Troca de modo de controle (PUT /robots/{address}/control-mode).
 * Casos CT-05-01 a CT-05-07 do Quadro 16, um por regra da tabela de decisão
 * (Quadro 8). Cada linha descreve a pré-condição e as saídas esperadas.
 */
interface Regra {
    id: string;
    regra: string;
    robo: { existe: boolean; modo?: RobotControlMode; comTask?: boolean };
    bordaFalha?: boolean;
    modo: number;
    status: number;
    /** Modo enviado no CONTROL_MODE (o robô só conhece Manual e Auto). */
    enviado?: RobotControlMode;
    /** Modo gravado no banco depois da requisição. */
    gravado: RobotControlMode | null;
    /** A task que o robô executava volta para a fila? */
    devolveTask?: boolean;
    /** Trecho da mensagem de erro que identifica a regra. */
    erro?: RegExp;
}

const regras: Regra[] = [
    { id: 'CT-05-01', regra: 'R1', robo: { existe: true, modo: Auto }, modo: 5, status: 400, erro: /mode deve ser 0 \(Manual\), 1 \(Auto\) ou 2 \(SemiAuto\)/, gravado: Auto },
    { id: 'CT-05-02', regra: 'R2', robo: { existe: false }, modo: Manual, status: 404, erro: /Nenhum robô com o endereço/, gravado: null },
    { id: 'CT-05-03', regra: 'R3', robo: { existe: true, modo: Auto }, bordaFalha: true, modo: Manual, status: 503, erro: /Nenhuma borda conectada/, gravado: Auto },
    { id: 'CT-05-04', regra: 'R4', robo: { existe: true, modo: Auto }, modo: Manual, status: 200, enviado: Manual, gravado: Manual },
    { id: 'CT-05-05', regra: 'R5', robo: { existe: true, modo: Auto, comTask: true }, modo: Manual, status: 200, enviado: Manual, gravado: Manual, devolveTask: true },
    { id: 'CT-05-06', regra: 'R6', robo: { existe: true, modo: Manual }, modo: SemiAuto, status: 200, enviado: Auto, gravado: SemiAuto },
    { id: 'CT-05-07', regra: 'R7', robo: { existe: true, modo: Auto, comTask: true }, modo: Auto, status: 200, enviado: Auto, gravado: Auto, devolveTask: true },
];

describe('RF05 – Troca de modo de controle', () => {
    let ctx: TestContext;
    let token: string;

    beforeAll(async () => { ctx = await createTestApp(); });
    afterAll(async () => { await ctx.app.close(); });
    beforeEach(async () => {
        await resetState(ctx);
        token = await getToken(ctx);
    });

    it.each(regras)('$id ($regra): mode $modo → $status', async (r) => {
        let taskId: string | null = null;

        if (r.robo.existe) {
            if (r.robo.comTask) {
                const task = await createTask(3, TaskStatus.InProgress);
                taskId = task.uuid;
            }
            await createRobot({ mode: r.robo.modo, taskId });
        }

        if (r.bordaFalha) {
            ctx.sendCommand.mockRejectedValue(new ServiceUnavailableException('Nenhuma borda conectada'));
        }

        const res = await put(ctx, token, `/robots/${ROBO}/control-mode`, { mode: r.modo });

        expect(res.status).toBe(r.status);

        if (r.erro) {
            expect(res.body.error).toMatch(r.erro);
        }

        if (r.enviado !== undefined) {
            expect(ctx.sendCommand).toHaveBeenCalledWith(ROBO, Command.ControlMode, { mode: r.enviado });
        } else if (!r.bordaFalha) {
            expect(ctx.sendCommand).not.toHaveBeenCalled();
        }

        const robo = await getRobot();
        expect(robo?.mode ?? null).toBe(r.gravado);

        if (taskId) {
            if (r.devolveTask) {
                await waitFor(async () => (await getRobot())?.taskId === null);
                expect((await getTask(taskId))?.status).toBe(TaskStatus.Pending);
            } else {
                expect((await getRobot())?.taskId).toBe(taskId);
            }
        }
    });
});
