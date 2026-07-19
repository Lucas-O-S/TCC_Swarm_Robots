import { PayloadCodec } from "../Protocol.Codec";
import { genericPayload, PayloadCoder } from "./PayloadProtocol";

/** Dados do comando xgo-action (código da ação, 1 byte). Só robôs XGO. */
export interface XgoActionPayload extends genericPayload {
    action: number;
}

export class XgoActionPayloadProtocol implements PayloadCoder<XgoActionPayload> {

    encodePayload(payload: XgoActionPayload): Buffer {
        return new PayloadCodec([
            { field: "action", value: payload.action, length: 1, signed: false },
        ]).Payload;
    }
}
