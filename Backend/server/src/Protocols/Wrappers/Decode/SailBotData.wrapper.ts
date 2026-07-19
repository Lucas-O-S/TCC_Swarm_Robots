import { PayloadCodec, PayloadField } from "../../Protocol.Codec";
import { PayloadDecoder } from "../PayloadProtocol";

/** Dados do SailBot (0x0A): rumo, posição GPS, vento e ângulos de leme/vela. */
export interface SailBotData {
    direction: number;
    latitude: number;
    longitude: number;
    wind_angle: number;
    rudder_angle: number;
    sail_angle: number;
}

export const SailBotDataFields: PayloadField[] = [
    { field: "direction",    length: 2, signed: false },
    { field: "latitude",     length: 4, signed: true  },
    { field: "longitude",    length: 4, signed: true  },
    { field: "wind_angle",   length: 2, signed: false },
    { field: "rudder_angle", length: 1, signed: true  },
    { field: "sail_angle",   length: 1, signed: true  },
];

export class SailBotDataProtocol implements PayloadDecoder<SailBotData> {

    decodePayload(body: Buffer): SailBotData {
        return PayloadCodec.decode(body, SailBotDataFields) as unknown as SailBotData;
    }
}
