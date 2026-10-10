import { PositionSource } from "src/Enums/PositionSource.enum";
import { RobotStatus } from "src/Enums/RobotStatus.enum";

/**
 * Formato do que a borda manda (JSON), do jeito que chega aqui - datas vêm
 * como string ISO. Espelha Edge/server/src/Classes/Swarm/Robot.State.ts.
 */

/** Nome do payload de advertisement do DotBot no campo `type` do estado. */
export const DOTBOT_ADVERTISEMENT = "DOTBOT_ADVERTISEMENT";

export interface EdgeRobotPosition {
    source: PositionSource;
    x: number;
    y: number;
    direction: number | null;
}

/** Evento `robot:state` (e o `state` das rotas GET da borda). */
export interface EdgeRobotState {
    address: string;
    /** Nome do payload, ex.: "DOTBOT_ADVERTISEMENT". */
    type: string;
    payloadType: number;
    /** Campos decodificados como vieram do robô (battery em mV, pos_x/pos_y em mm...). */
    data: any;
    /** Posição já extraída pela borda (null = payload sem posição ou sem leitura). */
    position: EdgeRobotPosition | null;
    updatedAt: string;
}

/** Evento `robot:status`: status calculado pela borda pelo tempo de silêncio. */
export interface EdgeRobotStatusEvent {
    address: string;
    status: RobotStatus;
    lastSync: string;
}

/** Item de GET /v1/robots. */
export interface EdgeRobotSnapshot {
    address: string;
    status: RobotStatus;
    state: EdgeRobotState;
}
