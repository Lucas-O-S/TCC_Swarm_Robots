import { PayloadCodec, PayloadField } from "../../Protocol.Codec";
import { PayloadDecoder } from "../PayloadProtocol";

/** Posição GPS (0x05): latitude e longitude em graus decimais * 1e6 (com sinal). */
export interface GpsPosition {
    latitude: number;
    longitude: number;
}

export const GpsPositionFields: PayloadField[] = [
    { field: "latitude",  length: 4, signed: true },
    { field: "longitude", length: 4, signed: true },
];

export class GpsPositionProtocol implements PayloadDecoder<GpsPosition> {

    decodePayload(body: Buffer): GpsPosition {
        return PayloadCodec.decode(body, GpsPositionFields) as unknown as GpsPosition;
    }
}
