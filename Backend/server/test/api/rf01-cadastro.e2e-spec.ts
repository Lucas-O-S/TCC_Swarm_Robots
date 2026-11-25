import { createTestApp, resetState, TestContext } from '../helpers/app';
import { post } from '../helpers/api';

/**
 * RF01 – Cadastro de usuário (POST /auth/register).
 * Casos CT-01-01 a CT-01-08 do Quadro 14: classes C1 a C6 (Quadro 4) e
 * valores-limite do tamanho da senha (Tabela 6).
 */
describe('RF01 – Cadastro de usuário', () => {
    let ctx: TestContext;

    beforeAll(async () => { ctx = await createTestApp(); });
    afterAll(async () => { await ctx.app.close(); });
    beforeEach(async () => { await resetState(ctx); });

    it.each([
        { id: 'CT-01-01', origem: 'C1, C4', dados: { username: 'lucas', password: 'senha123' }, status: 201 },
        { id: 'CT-01-02', origem: 'C2', dados: { username: '', password: 'senha123' }, status: 400 },
        { id: 'CT-01-03', origem: 'C3', dados: { password: 'senha123' }, status: 400 },
        { id: 'CT-01-04', origem: 'C5', dados: { username: 'ana', password: 'abc' }, status: 400 },
        { id: 'CT-01-05', origem: 'C6', dados: { username: 'ana' }, status: 400 },
        { id: 'CT-01-06', origem: 'AVL (5)', dados: { username: 'ana', password: 'abcde' }, status: 400 },
        { id: 'CT-01-07', origem: 'AVL (6)', dados: { username: 'ana', password: 'abcdef' }, status: 201 },
        { id: 'CT-01-08', origem: 'AVL (7)', dados: { username: 'ana', password: 'abcdefg' }, status: 201 },
    ])('$id ($origem): $dados → $status', async ({ dados, status }) => {
        const res = await post(ctx, '/auth/register', dados);

        expect(res.status).toBe(status);

        if (status === 201) {
            expect(res.body.dataUnit).toEqual({ uuid: expect.any(String), username: dados.username });
        }
    });
});
