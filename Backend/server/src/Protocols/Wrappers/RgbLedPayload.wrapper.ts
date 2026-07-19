import { PayloadCodec, PayloadField } from "../Protocol.Codec";
import { genericPayload, PayloadProtocol } from "./PayloadProtocol";

/** Dados esperados do comando rgb-led (cada canal 0..255). */
export interface RgbLedPayload extends genericPayload {
    red: number;
    green: number;
    blue: number;
}

/** Planta dos bytes do rgb-led - a mesma lista serve pro encode e pro decode. */
export const RgbLedFields: PayloadField[] = [
    { field: "red",   length: 1, signed: false },
    { field: "green", length: 1, signed: false },
    { field: "blue",  length: 1, signed: false },
];

export class RgbLedPayloadProtocol implements PayloadProtocol<RgbLedPayload> {

    encodePayload(payload: RgbLedPayload): Buffer {
        return new PayloadCodec(
            RgbLedFields.map(f => ({ ...f, value: payload[f.field as keyof RgbLedPayload] })),
        ).Payload;
    }

    decodePayload(body: Buffer): RgbLedPayload {
        return PayloadCodec.decode(body, RgbLedFields) as unknown as RgbLedPayload;
    }
}
