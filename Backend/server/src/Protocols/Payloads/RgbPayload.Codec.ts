import { PayloadCodec } from "./Protocol.Codec";



export interface RgbLedPayload {
    red: number;
    green: number;
    blue: number;
}

export class RgbLedPayloadProtocol implements PayloadCodec<RgbLedPayload> {


    encodePayload(payload: RgbLedPayload): Buffer {
        const buffer = Buffer.alloc(3);
    
        buffer.writeUInt8(payload.red, 0);
        
        buffer.writeUInt8(payload.green, 1);
        
        buffer.writeUInt8(payload.blue, 2);
        
        return buffer;
    }
}
