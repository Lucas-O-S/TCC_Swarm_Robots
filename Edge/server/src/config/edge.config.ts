import 'dotenv/config';

/**
 * Config da própria borda (o resto - serial, MQTT, simulador fake - fica nos
 * configs de cada transporte).
 *
 * `authActivated`/`token`: liga/desliga o token único da borda, no mesmo
 * espírito do AUTH_ACTIVATED da API. Com false, REST e socket.io ficam
 * abertos (desenvolvimento). Com true, todo cliente manda
 * `Authorization: Bearer <EDGE_TOKEN>` no REST e `auth: { token }` no socket.io.
 * Não existe usuário nem escopo: a premissa é UM sistema usando a borda por vez.
 */
export const edgeConfig = {
    port: Number(process.env.EDGE_PORT ?? 3001),
    authActivated: process.env.EDGE_AUTH_ACTIVATED === 'true',
    token: process.env.EDGE_TOKEN ?? '',
};
