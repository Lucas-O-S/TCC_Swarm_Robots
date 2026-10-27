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

/**
 * Evento `robot:states` da borda: lote (~20 ms) dos estados decodificados,
 * em ordem de chegada. Cada item é um EdgeRobotState.
 */
export interface EdgeRobotStatesEvent {
    states: EdgeRobotState[];
}

/** Item do lote `robot:states` (e o `state` das rotas GET da borda). */
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
    lh2: Lh2Data | null;
}

/** Evento `robot:status`: status calculado pela borda pelo tempo de silêncio. */
export interface EdgeRobotStatusEvent {
    address: string;
    status: RobotStatus;
    lastSync: string;
}

/** O que a API manda no `robot:command` (borda conectada no /edge). */
export interface EdgeCommandRequest {
    address: string;
    command: string;
    payload: any;
}

/**
 * Ack do `robot:command`: status HTTP equivalente ao da rota de comando da
 * borda (2xx = ok) + o mesmo corpo de erro (`message`) ou o retorno (`data`).
 */
export interface EdgeCommandAck {
    status: number;
    message?: string | string[];
    data?: unknown;
}

/** Item de GET /v1/robots. */
export interface EdgeRobotSnapshot {
    address: string;
    status: RobotStatus;
    state: EdgeRobotState;
}


//dados do lh2 enviados pela edge
export interface Lh2Data {
    
    valid: boolean;
    deviceCount: number;

}

