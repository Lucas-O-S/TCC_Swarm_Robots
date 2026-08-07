import { PayloadType, isValidPayloadType } from "src/Enums/PayloadType.enum";



export class Frame  {
    header : Buffer;
    payloadType : PayloadType | null;
    body: Buffer;

    constructor(header : Buffer, payloadType : PayloadType | null, body: Buffer){
        this.header = header;
        this.payloadType = payloadType;
        this.body = body;
    }
}

export class Protocol{

    static buildHeader(
        destination : string,
        version : number = 1,
        type : number = 16,
        source : string = "0000000000000000"
    ): Buffer
    {

        const buffer = Buffer.alloc(18);

        //Geralmente 16 e 1 para comando e tipo
        buffer.writeUInt8(version,0);
        buffer.writeUInt8(type,1);

        buffer.writeBigUInt64LE(BigInt("0x" + destination), 2);

        // source=0 (host) pra envio; frames que ENTRAM passam o endereço real do robô
        buffer.writeBigUInt64LE(BigInt("0x" + source),10)

        return buffer;

    }
    
    static buildFrame(
        frame : Frame
    ) : Buffer
    {

        // 18(header) + 1(payloadType) + body
        const buffer : Buffer = Buffer.concat([
            frame.header,
            Buffer.from([frame.payloadType ?? 0]),
            frame.body
        ])

        return buffer;

    }


    static parseFrame(frame : Buffer) : Frame {

        const header : Buffer = frame.subarray(0,18);

        const payloadType : PayloadType | null = this.validatePayloadType(frame.readUInt8(18));
        
        const body : Buffer = frame.subarray(19);

        return new Frame(header, payloadType, body);

        
    }

    private static validatePayloadType(payloadTypeByte: number): PayloadType | null {

        if (!isValidPayloadType(payloadTypeByte)) {
            console.error(`Invalid payload type: ${payloadTypeByte}`);
            return null;
        }

        return payloadTypeByte as PayloadType;
    }
}