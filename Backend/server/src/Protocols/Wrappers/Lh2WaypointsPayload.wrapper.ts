import { PayloadCodec } from "../Protocol.Codec";
import { PayloadProtocol } from "./PayloadProtocol";

/** Um ponto de destino em coordenadas LH2 (mm), 4 bytes por eixo. */
export interface Waypoint {
    x: number;
    y: number;
}

/** Dados do comando lh2-waypoints: distância de chegada + lista de pontos. */
export interface Lh2WaypointsPayload {
    threshold: number;
    waypoints: Waypoint[];
}

/**
 * Payload de tamanho variável: parte fixa (threshold + count) montada pelo
 * motor, e a lista de pontos concatenada em seguida. O `count` é derivado do
 * tamanho da lista, então nunca fica dessincronizado com os pontos.
 */
export class Lh2WaypointsPayloadProtocol implements PayloadProtocol<Lh2WaypointsPayload> {

    encodePayload(payload: Lh2WaypointsPayload): Buffer {
        // Parte fixa: threshold (2 bytes) + count (1 byte, = nº de pontos).
        const header = new PayloadCodec([
            { field: "threshold", value: payload.threshold,        length: 2, signed: false },
            { field: "count",     value: payload.waypoints.length, length: 1, signed: false },
        ]).Payload;

        // Parte variável: cada ponto vira pos_x (4 bytes) + pos_y (4 bytes).
        const points = payload.waypoints.map((wp) =>
            new PayloadCodec([
                { field: "pos_x", value: wp.x, length: 4, signed: false },
                { field: "pos_y", value: wp.y, length: 4, signed: false },
            ]).Payload,
        );

        return Buffer.concat([header, ...points]);
    }
}
