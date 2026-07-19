import { PayloadCodec } from "../Protocol.Codec";
import { PayloadProtocol } from "./PayloadProtocol";

/** Dados esperados do comando move-raw (joystick, cada eixo -128..127). */
export interface MovePayload {
    left_x: number;
    left_y: number;
    right_x: number;
    right_y: number;
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
