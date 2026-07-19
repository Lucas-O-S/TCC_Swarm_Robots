import { PayloadCodec } from "../Protocol.Codec";




export interface MovePayload {
    left_x: number,
    left_y: number,
    right_x: number,
    right_y: number
}


export class MovePayloadProtocol implements PayloadCodec<MovePayload> {

    payloadFields() {
        return ['left_x', 'left_y', 'right_x', 'right_y'];
    }

    encodePayload (payload: MovePayload): Buffer {

        const buffer = Buffer.alloc(4)

        buffer.writeInt8(payload.left_x, 0);
        buffer.writeInt8(payload.left_y, 1);
        buffer.writeInt8(payload.right_x, 2);
        buffer.writeInt8(payload.right_y, 3);

        return buffer;
    }
}