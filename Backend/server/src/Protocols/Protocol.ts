import { PayloadType } from "src/Enums/PayloadType.enum";



export class Frame  {
    header : Buffer;
    payloadType : PayloadType;
    body: Buffer;

    constructor(header : Buffer, payloadType : PayloadType, body: Buffer){
        this.header = header;
        this.payloadType = payloadType;
        this.body = body;
    }
}

export class Protocol{

    static buildHeader(
        destination : string,
        version : number = 1,
        type : number = 16
    ): Buffer
    {

        const buffer = Buffer.alloc(18);

        //Geralmente 16 e 1 para comando e tipo
        buffer.writeUInt8(version,0);
        buffer.writeUInt8(type,1);
        
        buffer.writeBigUInt64LE(BigInt("0x" + destination), 2);

        buffer.writeBigUInt64LE(0n,10)

        return buffer;

    }
    
    static buildFrame(
        frame : Frame
    ) : Buffer
    {

        // 18(header) + 1(payloadType) + body
        const buffer : Buffer = Buffer.concat([
            frame.header,
            Buffer.from([frame.payloadType]),
            frame.body
        ])

        return buffer;

    }


    static parseFrame(frame : Buffer) : Frame {

        
    }
}