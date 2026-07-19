/** Descrição de um campo: nome + quantos bytes ocupa + se é com sinal. */
export interface PayloadField {
    field: string;
    length?: number;
    signed?: boolean;
}

/** Um campo com valor (usado no encode). Reaproveita a descrição do PayloadField. */
export interface PayloadItem extends PayloadField {
    value: number;
}

export class PayloadCodec {

    private payload: Buffer;

    constructor(payload: PayloadItem[]) {
        this.payload = this.encodePayload(payload);
    }

    get Payload(): Buffer {
        return this.payload;
    }

    // ---- encode: objeto -> bytes ----

    private encodePayload(payload: PayloadItem[]): Buffer {
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

    private bufferWrite(item: PayloadItem, len: number, buffer: Buffer, offset: number): void {
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

    // ---- decode: bytes -> objeto (inverso do encode) ----

    static decode(buffer: Buffer, fields: PayloadField[]): Record<string, number> {
        const result: Record<string, number> = {};
        let offset = 0;

        for (const field of fields) {
            const len = field.length ?? 1;
            result[field.field] = PayloadCodec.bufferRead(field, len, buffer, offset);
            offset += len;
        }

        return result;
    }

    private static bufferRead(field: PayloadField, len: number, buffer: Buffer, offset: number): number {
        switch (len) {
            case 1:
                return field.signed ? buffer.readInt8(offset) : buffer.readUInt8(offset);
            case 2:
                return field.signed ? buffer.readInt16LE(offset) : buffer.readUInt16LE(offset);
            case 4:
                return field.signed ? buffer.readInt32LE(offset) : buffer.readUInt32LE(offset);
            default:
                throw new Error(`Unsupported payload item length: ${len}`);
        }
    }
}
