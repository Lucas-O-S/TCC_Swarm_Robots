import { PayloadType, isValidPayloadType } from "src/Enums/PayloadType.enum";
import { ADDRESS_HEX_LEN, HOST_ADDRESS } from "src/Constants/Address.Constants";
import {
    FRAME_DESTINATION_OFFSET,
    FRAME_HEADER_LEN,
    FRAME_SOURCE_OFFSET,
    FRAME_TYPE_DATA,
    FRAME_VERSION,
} from "src/Constants/Frame.Constants";



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

    /**
     * Forma canônica do `address` em todo o backend (banco, Map do
     * SwarmService, rotas): hex em MAIÚSCULAS, como o swarmit/CLI imprime.
     * O toString(16) devolve minúsculas, e o Postgres compara com caixa - um
     * robô cadastrado em maiúsculas não casava com o que chegava da rede e o
     * auto-cadastro criava uma duplicata em minúsculas.
     */
    static normalizeAddress(address: string): string {
        return address.toUpperCase();
    }

    /** Lê um endereço de 8 bytes (little-endian) já na forma canônica. */
    static readAddress(buffer: Buffer, offset: number): string {
        return Protocol.normalizeAddress(buffer.readBigUInt64LE(offset).toString(16).padStart(ADDRESS_HEX_LEN, "0"));
    }

    static buildHeader(
        destination : string,
        version : number = FRAME_VERSION,
        type : number = FRAME_TYPE_DATA,
        source : string = HOST_ADDRESS
    ): Buffer
    {

        const buffer = Buffer.alloc(FRAME_HEADER_LEN);

        //Geralmente 16 e 1 para comando e tipo
        buffer.writeUInt8(version,0);
        buffer.writeUInt8(type,1);

        buffer.writeBigUInt64LE(BigInt("0x" + destination), FRAME_DESTINATION_OFFSET);

        // source=0 (host) pra envio; frames que ENTRAM passam o endereço real do robô
        buffer.writeBigUInt64LE(BigInt("0x" + source), FRAME_SOURCE_OFFSET)

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

        const header : Buffer = frame.subarray(0, FRAME_HEADER_LEN);

        const payloadType : PayloadType | null = this.validatePayloadType(frame.readUInt8(FRAME_HEADER_LEN));
        
        const body : Buffer = frame.subarray(FRAME_HEADER_LEN + 1);

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