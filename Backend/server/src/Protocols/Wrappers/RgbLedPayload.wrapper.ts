import { PayloadCodec } from "../Protocol.Codec";
import { PayloadProtocol } from "./PayloadProtocol";

/** Dados esperados do comando rgb-led (cada canal 0..255). */
export interface RgbLedPayload {
    red: number;
    green: number;
    blue: number;
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
