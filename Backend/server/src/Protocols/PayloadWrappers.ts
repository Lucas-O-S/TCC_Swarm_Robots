import { PayloadCodec } from "./Protocol.Codec";

/**
 * Contrato comum de todo wrapper de payload. O tipo `T` é o formato esperado
 * dos dados daquele comando - cada wrapper preenche com o seu, então dentro
 * do encodePayload os campos ficam tipados (autocomplete + checagem do TS).
 */
export interface PayloadProtocol<T> {
    encodePayload(payload: T): Buffer;
}

/** Dados esperados do comando move-raw (joystick, cada eixo -128..127). */
export interface MovePayload {
    left_x: number;
    left_y: number;
    right_x: number;
    right_y: number;
}

/** Dados esperados do comando rgb-led (cada canal 0..255). */
export interface RgbLedPayload {
    red: number;
    green: number;
    blue: number;
}

export class MovePayloadProtocol implements PayloadProtocol<MovePayload> {

    encodePayload(payload: MovePayload): Buffer {
        return new PayloadCodec([
            { field: "left_x",  value: payload.left_x,  length: 1, signed: true },
            { field: "left_y",  value: payload.left_y,  length: 1, signed: true },
            { field: "right_x", value: payload.right_x, length: 1, signed: true },
            { field: "right_y", value: payload.right_y, length: 1, signed: true },
        ]).Payload;
    }
}

export class RgbLedPayloadProtocol implements PayloadProtocol<RgbLedPayload> {

    encodePayload(payload: RgbLedPayload): Buffer {
        return new PayloadCodec([
            { field: "red",   value: payload.red,   length: 1, signed: false },
            { field: "green", value: payload.green, length: 1, signed: false },
            { field: "blue",  value: payload.blue,  length: 1, signed: false },
        ]).Payload;
    }
}
