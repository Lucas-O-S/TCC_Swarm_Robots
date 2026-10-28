import 'dotenv/config';
import { hostname } from 'os';

/**
 * Config da própria borda (o resto - serial, MQTT, simulador fake - fica nos
 * configs de cada transporte).
 *
 * `authActivated`/`token`: liga/desliga o token único da borda, no mesmo
 * espírito do AUTH_ACTIVATED da API. Com false, REST e socket.io ficam
 * abertos (desenvolvimento). Com true, todo cliente manda
 * `Authorization: Bearer <EDGE_TOKEN>` no REST e `auth: { token }` no socket.io.
 * Não existe usuário nem escopo: a premissa é UM sistema usando a borda por vez.
 *
 * `backendUrl`: back para o qual a borda abre o uplink (socket.io-client, com
 * o mesmo EDGE_TOKEN). Vazio = uplink desligado.
 *
 * `edgeId`: nome desta borda no back (vai no auth do uplink). Default: hostname.
 */
export const edgeConfig = {
    port: Number(process.env.EDGE_PORT ?? 3001),
    authActivated: process.env.EDGE_AUTH_ACTIVATED === 'true',
    token: process.env.EDGE_TOKEN ?? '',
    backendUrl: process.env.BACKEND_URL ?? '',
    edgeId: process.env.EDGE_ID || hostname(),
};
