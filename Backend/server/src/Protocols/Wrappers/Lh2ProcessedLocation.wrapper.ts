import { PayloadCodec, PayloadField } from "../Protocol.Codec";
import { PayloadDecoder } from "./PayloadProtocol";

/** Localização LH2 já processada (0x0C): índices do polinômio/LFSR + timestamp. */
export interface Lh2ProcessedLocation {
    polynomial_index: number;
    lfsr_index: number;
    timestamp_us: number;
}

export const Lh2ProcessedLocationFields: PayloadField[] = [
    { field: "polynomial_index", length: 1, signed: false },
    { field: "lfsr_index",       length: 4, signed: false },
    { field: "timestamp_us",     length: 4, signed: false },
];

export class Lh2ProcessedLocationProtocol implements PayloadDecoder<Lh2ProcessedLocation> {

    decodePayload(body: Buffer): Lh2ProcessedLocation {
        return PayloadCodec.decode(body, Lh2ProcessedLocationFields) as unknown as Lh2ProcessedLocation;
    }
}
