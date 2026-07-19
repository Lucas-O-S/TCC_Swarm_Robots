import { PayloadCodec, PayloadField } from "../../Protocol.Codec";
import { PayloadDecoder } from "../PayloadProtocol";

/** Dados do simulador do DotBot (0xFA): ângulo theta + posição. */
export interface DotBotSimulatorData {
    theta: number;
    pos_x: number;
    pos_y: number;
}

export const DotBotSimulatorDataFields: PayloadField[] = [
    { field: "theta", length: 2, signed: false },
    { field: "pos_x", length: 4, signed: false },
    { field: "pos_y", length: 4, signed: false },
];

export class DotBotSimulatorDataProtocol implements PayloadDecoder<DotBotSimulatorData> {

    decodePayload(body: Buffer): DotBotSimulatorData {
        return PayloadCodec.decode(body, DotBotSimulatorDataFields) as unknown as DotBotSimulatorData;
    }
}
