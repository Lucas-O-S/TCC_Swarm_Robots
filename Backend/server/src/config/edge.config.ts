import 'dotenv/config';

/**
 * Onde está a borda (Edge/server) e o token dela. A API do front não fala mais
 * com o hardware: comandos vão por HTTP (POST /v1/robots/:address/commands/...)
 * e a telemetria chega pelo socket.io da borda (robot:states / robot:status).
 *
 * `token`: o mesmo EDGE_TOKEN configurado na borda. Vazio = não manda token
 * (borda com EDGE_AUTH_ACTIVATED=false).
 */
export const edgeConfig = {
    // Vazio = a API não conecta na borda; só aceita a borda no namespace /edge.
    url: (process.env.EDGE_URL ?? '').replace(/\/+$/, ''),
    token: process.env.EDGE_TOKEN ?? '',
    requestTimeoutMs: Number(process.env.EDGE_TIMEOUT_MS ?? 3000),
};
