import { createTestApp, resetState, TestContext } from '../helpers/app';
import { getToken, put } from '../helpers/api';
import { createRobot, ROBO } from '../helpers/db';
import { Command } from 'src/Enums/Command.enum';

/**
 * RF07 – Controle do LED (PUT /robots/{address}/rgb-led).
 * Casos CT-07-01 a CT-07-11 do Quadro 18: classes C1 a C5 (Quadro 6) e
 * valores-limite de 0 e 255 (Tabela 6), aplicados no canal red.
 */
describe('RF07 – Controle do LED', () => {
    let ctx: TestContext;
    let token: string;

    beforeAll(async () => { ctx = await createTestApp(); });
    afterAll(async () => { await ctx.app.close(); });
    beforeEach(async () => {
        await resetState(ctx);
        token = await getToken(ctx);
        await createRobot();
    });

    it.each([
        { id: 'CT-07-01', origem: 'C1', red: 128, status: 200 },
        { id: 'CT-07-02', origem: 'C2', red: -50, status: 400 },
        { id: 'CT-07-03', origem: 'C3', red: 400, status: 400 },
        { id: 'CT-07-04', origem: 'C4', red: 'abc', status: 400 },
        { id: 'CT-07-05', origem: 'C5', red: undefined, status: 400 },
        { id: 'CT-07-06', origem: 'AVL', red: -1, status: 400 },
        { id: 'CT-07-07', origem: 'AVL', red: 0, status: 200 },
        { id: 'CT-07-08', origem: 'AVL', red: 1, status: 200 },
        { id: 'CT-07-09', origem: 'AVL', red: 254, status: 200 },
        { id: 'CT-07-10', origem: 'AVL', red: 255, status: 200 },
        { id: 'CT-07-11', origem: 'AVL', red: 256, status: 400 },
    ])('$id ($origem): red $red → $status', async ({ red, status }) => {
        const dados = { red, green: 0, blue: 0 };

        const res = await put(ctx, token, `/robots/${ROBO}/rgb-led`, dados);

        expect(res.status).toBe(status);

        if (status === 200) {
            expect(ctx.sendCommand).toHaveBeenCalledWith(ROBO, Command.RgbLed, dados);
        } else {
            expect(ctx.sendCommand).not.toHaveBeenCalled();
        }
    });
});
