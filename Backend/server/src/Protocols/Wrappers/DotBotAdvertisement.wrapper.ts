import { PayloadCodec, PayloadField } from "../Protocol.Codec";
import { PayloadDecoder } from "./PayloadProtocol";

/**
 * Advertisement completo do DotBot (0x06) - o pacote de status principal que o
 * robô manda de volta: posição, bateria, modo, encoders, waypoint atual, etc.
 */
export interface DotBotAdvertisement {
    calibrated: number;
    direction: number;
    pos_x: number;
    pos_y: number;
    battery: number;
    pwm_left: number;
    pwm_right: number;
    mode: number;
    encoder_left: number;
    encoder_right: number;
    waypoint_x: number;
    waypoint_y: number;
    waypoint_idx: number;
}

export const DotBotAdvertisementFields: PayloadField[] = [
    { field: "calibrated",    length: 1, signed: false },
    { field: "direction",     length: 2, signed: true  },
    { field: "pos_x",         length: 4, signed: false },
    { field: "pos_y",         length: 4, signed: false },
    { field: "battery",       length: 2, signed: false },
    { field: "pwm_left",      length: 1, signed: true  },
    { field: "pwm_right",     length: 1, signed: true  },
    { field: "mode",          length: 1, signed: false },
    { field: "encoder_left",  length: 4, signed: true  },
    { field: "encoder_right", length: 4, signed: true  },
    { field: "waypoint_x",    length: 4, signed: false },
    { field: "waypoint_y",    length: 4, signed: false },
    { field: "waypoint_idx",  length: 1, signed: false },
];

export class DotBotAdvertisementProtocol implements PayloadDecoder<DotBotAdvertisement> {

    decodePayload(body: Buffer): DotBotAdvertisement {
        return PayloadCodec.decode(body, DotBotAdvertisementFields) as unknown as DotBotAdvertisement;
    }
}
