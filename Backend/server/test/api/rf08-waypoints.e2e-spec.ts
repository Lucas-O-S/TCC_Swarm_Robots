import { createTestApp, resetState, TestContext } from '../helpers/app';
import { getToken, put } from '../helpers/api';
import { createRobot, ROBO } from '../helpers/db';
import { Command } from 'src/Enums/Command.enum';

/**
 * RF08 – Envio de waypoints (PUT /robots/{address}/waypoints).
 * Casos CT-08-01 a CT-08-16 do Quadro 19: classes C1 a C8 (Quadro 7) e
 * valores-limite da quantidade de pontos, de x e do threshold (Tabela 6).
 */
describe('RF08 – Envio de waypoints', () => {
    let ctx: TestContext;
    let token: string;

    beforeAll(async () => { ctx = await createTestApp(); });
    afterAll(async () => { await ctx.app.close(); });
    beforeEach(async () => {
        await resetState(ctx);
        token = await getToken(ctx);
        await createRobot();
    });

    /** n pontos em (x, 300) com o threshold informado. */
    const corpo = (n: number, x: number = 300, threshold: number = 100) => ({
        threshold,
        waypoints: Array.from({ length: n }, () => ({ x, y: 300 })),
    });

    it.each([
        { id: 'CT-08-01', origem: 'C1, C4, C7', dados: corpo(5), status: 200 },
        { id: 'CT-08-02', origem: 'C2, AVL', dados: corpo(0), status: 400 },
        { id: 'CT-08-03', origem: 'C3', dados: corpo(20), status: 400 },
        { id: 'CT-08-04', origem: 'C5', dados: corpo(1, -10), status: 400 },
        { id: 'CT-08-05', origem: 'C6', dados: corpo(1, 2.5), status: 400 },
        { id: 'CT-08-06', origem: 'C8, AVL', dados: corpo(1, 300, -1), status: 400 },
        { id: 'CT-08-07', origem: 'AVL', dados: corpo(1), status: 200 },
        { id: 'CT-08-08', origem: 'AVL', dados: corpo(2), status: 200 },
        { id: 'CT-08-09', origem: 'AVL', dados: corpo(15), status: 200 },
        { id: 'CT-08-10', origem: 'AVL', dados: corpo(16), status: 200 },
        { id: 'CT-08-11', origem: 'AVL', dados: corpo(17), status: 400 },
        { id: 'CT-08-12', origem: 'AVL', dados: corpo(1, -1), status: 400 },
        { id: 'CT-08-13', origem: 'AVL', dados: corpo(1, 0), status: 200 },
        { id: 'CT-08-14', origem: 'AVL', dados: corpo(1, 1), status: 200 },
        { id: 'CT-08-15', origem: 'AVL', dados: corpo(1, 300, 0), status: 200 },
        { id: 'CT-08-16', origem: 'AVL', dados: corpo(1, 300, 1), status: 200 },
    ])('$id ($origem) → $status', async ({ dados, status }) => {
        const res = await put(ctx, token, `/robots/${ROBO}/waypoints`, dados);

        expect(res.status).toBe(status);

        if (status === 200) {
            expect(ctx.sendCommand).toHaveBeenCalledWith(ROBO, Command.Waypoints, dados);
        } else {
            expect(ctx.sendCommand).not.toHaveBeenCalled();
        }
    });
});
