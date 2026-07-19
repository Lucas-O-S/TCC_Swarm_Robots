import { PayloadCodec } from "../Protocol.Codec";
import { genericPayload, PayloadProtocol } from "./PayloadProtocol";

/** Dados do comando control-mode (0=Manual, 1=Auto). */
export interface ControlModePayload extends genericPayload {
    mode: number;
}

export class ControlModePayloadProtocol implements PayloadProtocol<ControlModePayload> {

    encodePayload(payload: ControlModePayload): Buffer {
        return new PayloadCodec([
            { field: "mode", value: payload.mode, length: 1, signed: false },
        ]).Payload;
    }
}
