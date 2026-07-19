export interface PayloadItem {

    field: string;
    value: any;
    length?: number;

    //signed quer dizer que o value é um inteiro com sinal (positivo ou negativo). Se não vier, assume-se que é sem sinal (positivo).
    signed?: boolean;

}

export class PayloadCodec {
    
    private payload : Buffer;

    constructor(payload: PayloadItem[]) {
        this.payload = this.encodePayload(payload);
    }

    get Payload(): Buffer {
        return this.payload;
    }

    private encodePayload(payload : PayloadItem[]): Buffer{

        const length = this.getPayloadLength(payload);
        
        const buffer = Buffer.alloc(length);
        
        let offset = 0;

        for (const payloadItem of payload) {
            
            const len = payloadItem.length ?? 1;

            this.bufferWrite(payloadItem, len, buffer, offset);

            offset += len;
        }

        return buffer;

    }

    private bufferWrite(
        item: PayloadItem,
        len: number,
        buffer: Buffer,
        offset: number
    ): void {

        switch (len) {
            case 1:
                item.signed ? buffer.writeInt8(item.value, offset) : buffer.writeUInt8(item.value, offset);
                break;
            case 2:
                item.signed ? buffer.writeInt16LE(item.value, offset) : buffer.writeUInt16LE(item.value, offset);
                break;
            case 4:
                item.signed ? buffer.writeInt32LE(item.value, offset) : buffer.writeUInt32LE(item.value, offset);
                break;
            default:
                throw new Error(`Unsupported payload item length: ${len}`);
        }
    }

    private getPayloadLength(payload: PayloadItem[]): number {
        let length = 0;
        for (const payloadItem of payload) length += payloadItem.length ?? 1;
        return length;
    }
}
