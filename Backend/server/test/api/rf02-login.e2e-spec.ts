import { createTestApp, resetState, TestContext } from '../helpers/app';
import { post, USUARIO } from '../helpers/api';

/**
 * RF02 – Login (POST /auth/login).
 * Casos CT-02-01 a CT-02-03 do Quadro 15: classes C7 a C9 (Quadro 4).
 * Pré-condição: usuário "lucas" com senha "senha123" cadastrado.
 */
describe('RF02 – Login', () => {
    let ctx: TestContext;

    beforeAll(async () => { ctx = await createTestApp(); });
    afterAll(async () => { await ctx.app.close(); });
    beforeEach(async () => {
        await resetState(ctx);
        await post(ctx, '/auth/register', USUARIO);
    });

    it.each([
        { id: 'CT-02-01', origem: 'C7', dados: { username: 'lucas', password: 'senha123' }, sucesso: true, status: 0 },
        { id: 'CT-02-02', origem: 'C8', dados: { username: '', password: 'senha123' }, sucesso: false, status: 400 },
        { id: 'CT-02-03', origem: 'C9', dados: { username: 'lucas', password: 'errada1' }, sucesso: false, status: 401 },
    ])('$id ($origem): $dados', async ({ dados, sucesso, status }) => {
        const res = await post(ctx, '/auth/login', dados);

        if (sucesso) {
            expect(res.ok).toBe(true);
            expect(res.body.dataUnit.access_token).toEqual(expect.any(String));
        } else {
            expect(res.status).toBe(status);
        }
    });
});
