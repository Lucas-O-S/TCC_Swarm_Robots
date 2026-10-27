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
 * Ack do `robot:command`. Espelha UplinkCommandReply da borda
 * (Edge/server/src/Classes/Uplink/Uplink.Types.ts): `status` segue o HTTP
 * da rota de comando (400 = corpo recusado, 500 = erro da borda).
 */
export type EdgeCommandAck =
    | { ok: true; data: unknown }
    | { ok: false; status: number; message: string };

/**
 * Evento `robot:snapshot`: quadro inteiro da frota, mandado pela borda a cada
 * (re)conexão no /edge. Espelha RobotSnapshotEvent da borda.
 */
export interface EdgeRobotSnapshotEvent {
    robots: EdgeRobotSnapshot[];
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

