import { GatewayIdentity } from "src/config/gateway.config";
import { Lh2Area } from "src/Protocols/Swarmit/Lh2Layout";

/**
 * Área do gateway, no referencial em que os robôs reportam a posição (mm, Y
 * pra baixo, origem no canto superior-esquerdo - o do firmware). É o que o
 * back guarda e o front desenha: o mapa nasce daqui, sem conversão.
 * Resposta do GET /v1/arena e corpo do evento arena:snapshot.
 */
export interface ArenaView {
    gateway: GatewayIdentity;
    // De onde veio: a calibração LH2 carregada (mari) ou ARENA_* do .env
    // (mqtt/simulator). null = desconhecida (mari sem calibração carregada,
    // ou ARENA_* vazio).
    source: "lh2" | "config" | null;
    // "area" = área real informada na calibração (com a margem antes dela);
    // "pydotbot" = calibração sem área, então vale a arena de 5 × o tamanho do
    // retângulo a partir de (0, 0); "config" = ARENA_* a partir de (0, 0).
    layout: "area" | "pydotbot" | "config" | null;
    area: Lh2Area | null;
    // Retângulo das 4 marcas de calibração no chão (só lh2).
    calibration: Lh2Area | null;
    // Canais da base station calibrados (só lh2).
    channels: number[] | null;
    // Versão da área: created_at da calibração (só lh2, null se o TOML não trouxer).
    version: string | null;
    // TOML de onde saiu (só lh2).
    file: string | null;
}
