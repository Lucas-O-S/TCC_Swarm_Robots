import { PayloadType } from "src/Enums/PayloadType.enum";
import { PositionSource } from "src/Enums/PositionSource.enum";
import { RobotStatus } from "src/Enums/RobotStatus.enum";
import { Lh2State } from "src/Protocols/Swarmit/Swarmit.Protocol";

/**
 * Posição já extraída do payload pela borda, para o cliente não precisar
 * conhecer sentinelas nem unidades do protocolo. LH2: x/y em mm, direction em
 * graus (null = sem leitura). GPS: x = latitude, y = longitude, graus decimais.
 */
export interface RobotPosition {
    source: PositionSource;
    x: number;
    y: number;
    direction: number | null;
}

/**
 * Último dado decodificado de um robô - o que sai no lote `robot:states` e
 * nas rotas GET. `type` é o nome do payload (ex.: "DOTBOT_ADVERTISEMENT");
 * `payloadType` é o mesmo em número. `data` traz os campos do decoder como
 * vieram do robô (battery em mV, pos_x/pos_y em mm, waypoint_idx...).
 * `lh2` é a calibração LH2 que o transporte reporta (só o Mari, via SwarmIT);
 * null = transporte sem SwarmIT (simulador/MQTT), a API não checa calibração.
 */
/**
 * Evento `robot:states`: os RobotState decodificados desde o último envio,
 * em ordem de chegada (pode ter mais de um do mesmo robô).
 */
export interface RobotStatesEvent {
    states: RobotState[];
}

export class RobotState {

    public readonly type: string;

    constructor(
        public readonly address: string,
        public readonly payloadType: PayloadType,
        public readonly data: any,
        public readonly position: RobotPosition | null,
        public readonly lh2: Lh2State | null,
        public readonly updatedAt: Date = new Date(),
    ) {
        this.type = PayloadType[payloadType];
    }
}

/** Evento `robot:status`: status calculado pelo tempo de silêncio. */
export interface RobotStatusEvent {
    address: string;
    status: RobotStatus;
    lastSync: Date;
}

/** Evento `robot:joined`. */
export interface RobotJoinedEvent {
    address: string;
}

/** Resposta das rotas GET /v1/robots e /v1/robots/:address. */
export interface RobotSnapshot {
    address: string;
    status: RobotStatus;
    state: RobotState;
}
