import request from 'supertest';
import { TestContext } from './app';

export const USUARIO = { username: 'lucas', password: 'senha123' };

/** Cadastra o usuário padrão e devolve o token do login. */
export async function getToken(ctx: TestContext): Promise<string> {
    await request(ctx.app.getHttpServer()).post('/auth/register').send(USUARIO);
    const res = await request(ctx.app.getHttpServer()).post('/auth/login').send(USUARIO);
    return res.body.dataUnit.access_token;
}

/** PUT autenticado numa rota protegida. */
export function put(ctx: TestContext, token: string, path: string, body: object) {
    return request(ctx.app.getHttpServer())
        .put(path)
        .set('Authorization', `Bearer ${token}`)
        .send(body);
}

/** POST sem autenticação (rotas de cadastro e login). */
export function post(ctx: TestContext, path: string, body: object) {
    return request(ctx.app.getHttpServer()).post(path).send(body);
}

/**
 * Espera um efeito assíncrono (ex.: o orquestrador soltar a task depois do
 * evento de troca de modo) sem depender de tempo fixo.
 */
export async function waitFor(check: () => Promise<boolean>, timeoutMs = 3000): Promise<void> {
    const inicio = Date.now();
    while (!(await check())) {
        if (Date.now() - inicio > timeoutMs) {
            throw new Error(`condição não atendida em ${timeoutMs} ms`);
        }
        await new Promise((r) => setTimeout(r, 25));
    }
}
