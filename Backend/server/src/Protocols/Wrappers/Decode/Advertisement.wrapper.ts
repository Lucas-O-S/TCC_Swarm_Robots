import { PayloadCodec } from "../../Protocol.Codec";
import { PayloadField } from "../../PayloadField";
import { PayloadDecoder } from "../PayloadProtocol";

/** Advertisement simples (0x04): só o tipo de aplicação do robô. */
export interface Advertisement {
    application: number;
}

export const AdvertisementFields: PayloadField[] = [
    { field: "application", length: 1, signed: false },
];

export class AdvertisementProtocol implements PayloadDecoder<Advertisement> {

    decodePayload(body: Buffer): Advertisement {
        return PayloadCodec.decode(body, AdvertisementFields) as unknown as Advertisement;
    }
}
