import { PayloadCodec } from "../Protocol.Codec";
import { PayloadProtocol } from "./PayloadProtocol";

/** Dados do comando xgo-action (código da ação, 1 byte). Só robôs XGO. */
export interface XgoActionPayload {
    action: number;
}

export class XgoActionPayloadProtocol implements PayloadProtocol<XgoActionPayload> {

    encodePayload(payload: XgoActionPayload): Buffer {
        return new PayloadCodec([
            { field: "action", value: payload.action, length: 1, signed: false },
        ]).Payload;
    }
}
