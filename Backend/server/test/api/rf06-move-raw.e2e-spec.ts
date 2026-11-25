import { createTestApp, resetState, TestContext } from '../helpers/app';
import { getToken, put } from '../helpers/api';
import { createRobot, ROBO } from '../helpers/db';
import { Command } from 'src/Enums/Command.enum';

/**
 * RF06 – Movimento direto (PUT /robots/{address}/move-raw).
 * Casos CT-06-01 a CT-06-11 do Quadro 17: classes C1 a C5 (Quadro 5) e
 * valores-limite de −128 e 127 (Tabela 6), aplicados em left_x.
 */
describe('RF06 – Movimento direto', () => {
    let ctx: TestContext;
    let token: string;

    beforeAll(async () => { ctx = await createTestApp(); });
    afterAll(async () => { await ctx.app.close(); });
    beforeEach(async () => {
        await resetState(ctx);
        token = await getToken(ctx);
        await createRobot();
    });

    const todos50 = { left_x: 50, left_y: 50, right_x: 50, right_y: 50 };
    const leftX = (valor: unknown) => ({ left_x: valor, left_y: 0, right_x: 0, right_y: 0 });

    it.each([
        { id: 'CT-06-01', origem: 'C1', dados: todos50, status: 200 },
        { id: 'CT-06-02', origem: 'C2', dados: leftX(-200), status: 400 },
        { id: 'CT-06-03', origem: 'C3', dados: leftX(200), status: 400 },
        { id: 'CT-06-04', origem: 'C4', dados: leftX(1.5), status: 400 },
        { id: 'CT-06-05', origem: 'C5', dados: leftX(undefined), status: 400 },
        { id: 'CT-06-06', origem: 'AVL', dados: leftX(-129), status: 400 },
        { id: 'CT-06-07', origem: 'AVL', dados: leftX(-128), status: 200 },
        { id: 'CT-06-08', origem: 'AVL', dados: leftX(-127), status: 200 },
        { id: 'CT-06-09', origem: 'AVL', dados: leftX(126), status: 200 },
        { id: 'CT-06-10', origem: 'AVL', dados: leftX(127), status: 200 },
        { id: 'CT-06-11', origem: 'AVL', dados: leftX(128), status: 400 },
    ])('$id ($origem): $dados → $status', async ({ dados, status }) => {
        const res = await put(ctx, token, `/robots/${ROBO}/move-raw`, dados);

        expect(res.status).toBe(status);

        if (status === 200) {
            expect(ctx.sendCommand).toHaveBeenCalledWith(ROBO, Command.MoveRaw, dados);
        } else {
            expect(ctx.sendCommand).not.toHaveBeenCalled();
        }
    });
});
